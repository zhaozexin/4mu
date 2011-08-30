/*
4mu
*/

$(document).ready(function() {

	var LOGIN_WARN = '�û�δ��¼';
	var URL_DEPARTMENT = 'http://guahao.zjol.com.cn/DepartMent.Aspx?ID=853'; //��������ר�Ҷ�¥
	var URL_RESUMENUM = 'http://guahao.zjol.com.cn/ashx/getResumeNum.ashx';  //ȡ����ź�ȡ��ʱ��
	var URL_RESUMEQR = 'http://guahao.zjol.com.cn/ashx/getResumeQR.ashx';  //ȡ�ùҺ���Ϣ
	var URL_TREADRESUME = 'http://guahao.zjol.com.cn/ashx/TreadResume.ashx'; //�Һ�ȷ��

	//����ҳ�����ݣ� ��ȡҳ��ȡ�ÿ�ԤԼ����������
	function loadSchedule(url) {  
		log('���� ' + location.href + ' �е�ԤԼ��Ϣ......');
		var re = /javascript:showDiv\(([0-9\',]+)\)/ig;
		var idArray = [];
		$.ajax({
			type: 'get',
			url: url || URL_DEPARTMENT,
			cache: false,
			timeout: 3000,
			complete: function(xhr, status) {
				if(idArray.length < 1) {
					if (canRetry()) { //����3��03��֮ǰ����������
						log('û�п���ԤԼ, ������......');
						setTimeout(function() {
							loadSchedule(url);
						}, 200);
					} else {
						log('û�п���ԤԼ�����ѹ�15:03�֣���������');
					}
				}
			},
			success:function(html) {
				/* ȡ��ԤԼ����
					SchId: �ճ�ID
					DateTime: ����yyyymmdd
					DateType: 0���� 1����
					HosID: ҽԺID
					DepID: ����ID
					DocID: ҽ��ID
				*/
				var ret;
				while ((ret = re.exec(html)) != null) {
					idArray[idArray.length] = $.map(ret[1].split(','), function(item) { //�Ƴ���β������
						return item.substring(1, item.length-1);
					});
				}
				if (idArray.length > 0) {
					for(var i = 0; i < idArray.length; ++i) {
						setTimeout(function(ids){
							return function() {
								getResumeNum(ids);
							}
						}(idArray[i]), 300*i);
					}
				} 
			}
		});
	}
	
	/**
	ȡ����ź͹Һ�ʱ��
	*/ 
	function getResumeNum(ids) {
		var data = {
			'SchId': ids[0],
			'DateTime': ids[1],
			'DateType': ids[2],
			'HosID': ids[3],
			'DepID': ids[4],
			'DocID': ids[5]
		}
		log('��ȡ�Һ����/ʱ����Ϣ', data);
		$.ajax({
			type: "POST",
			url: URL_RESUMENUM,
			data: data,
			error: function() {
				log('��ȡ�Һ����/ʱ����Ϣ��������������', data);
				if(canRetry()) {
					log('���Ի�ȡ�Һ����/ʱ����Ϣ', data);
					setTimeout(function() {
						getResumeNum(ids);
					}, 200);
				}					
			},
			success:function(result) {
				//��ʽe.g.  $2891076|11|1400$2891077|12|1406$2891078|13|1412$2891079|14|1418$2891080|15|1424
				if (result) {
					if (result == LOGIN_WARN) { //û�е�¼
						log(result);
						alert('�����ȵ�¼ϵͳ')
						return;
					}
					getResumeQR(result);
				} else {
					log('�޷���ȡ�Һ����/ʱ����Ϣ', data);
				}
			}
		});
	}
	
	/**
	��ȡ�Һ�����Ϣ
	*/
	function getResumeQR(ret) {
		var qrs = ret.substring(1).split('$');
		if (qrs.length > 0) {
			//ѭ����ȡ���п��ܵ����
			$.each(qrs, function(index, qr) {
				setTimeout(function() {
					var qra = qr.split('|');
					var data = {
						NUM: qra[0],
						XH: qra[1],
						S: qra[2]
					}
					_getResumeQR(data);				
				}, 500*index*index); //����Ƶ������,���ʱ��ӳ�
			});
		}
	}

	function _getResumeQR(data) {
		log('��ȡ�Һ���ȷ����Ϣ', data);
		$.ajax({
				type: "POST",
				url: URL_RESUMEQR,
				data: data,
				error: function() {
					log('��ȡ�Һ�����Ϣ��������������', data);
					if(canRetry()) {
						log('���Ի�ȡ�Һ�����Ϣ', data);
						setTimeout(function() {
							_getResumeQR(data);
						}, 200);
					}					
				},
				success:function(result) {
					addToQueue(result); //�����������
				}
		});
	}


	/**
	���뵽�������
	*/
	function addToQueue(result) {
		var data = result.split('|');
		if (data.length > 0) { 
			var qdata = [data[9], data[8], data[10], data[11]];
			QUEUE.add(qdata);
		}
	}

	/**
		������������
	*/
	function goodLucky(qs, callback) {
		var data = {patID: qs[0],
					numID: qs[1],
					mpCode: qs[2],
					hosID: qs[3]
					};
		$.ajax({
			type: "POST",
			url: URL_TREADRESUME,
			data: data,
			timeout: 16000,
			complete: function(xhr, status) {
				if(status == 'success' && xhr.responseText.indexOf('OK') == 0) {
					callback(true);
					alert('���������Һųɹ�!');
					if (confirm('����ȥ�鿴ԤԼ��¼?')) {
						location.href = 'http://guahao.zjol.com.cn/UserResumeList.Aspx';
					}
				} else {
					callback(false);
				}
			}
		});
	};

	var QUEUE = {
		q: [],
		id: null,
		add: function(data) {
			if (!this.q) {
				log('�ҺŶ�����ȡ��');
				return;
			}
			this.q.push(data);
			log('����Һ������������', data.join(','));
		},
		run: function() {
			if (!this.q) {
				log('�ҺŶ�����ȡ��');
			} else {
				if (this.q.length > 0) {
					var cq = this.q.shift();
					log('����������͹Һ�����ȷ��', cq.join(','));
					goodLucky(cq, function(ok){ /* callback */
						if (ok) {
							log('�㶨�ˣ��Һ�����ɹ�������ȡ��');
							QUEUE.stop();
						} else {
							log('��������δ�ɹ������Զ�����һ������');
							QUEUE.q.push(cq); //���¼������
							QUEUE.id = setTimeout(function() {QUEUE.run();}, 100);
						}
					});
				} else {
					if(canRetry()) {
						log('�ҺŶ���û���������󣬵ȴ�......');
						this.id = setTimeout(function() {QUEUE.run();}, 500);
					} else {
						log('û�йҺ����룬���ѹ�15:03�֣�����ȡ��');
						this.stop();
					}
				}
			}			
		},
		start: function() {
			log('���ùҺ��������');
			this.q = [];
			this.run();
		},
		stop: function() {
			log('ֹͣ�Һ��������');
			clearTimeout(this.id);
			this.q = null;
		}
	};  //����ȫ�ֶ���


	//�Ƿ���Ҫ���ԣ�����3��3���Ժ󣬲������ԣ�
	function canRetry() {
		/* 10������ for test
		if (!canRetry.count) {
			canRetry.count = 1;
		} else {
			canRetry.count++;
		}
		return canRetry.count < 10;
		*/
		var now = new Date();
		return (now.getHours() === 15 && now.getMinutes() < 3) || (now.getHours() === 14 && now.getMinutes() >= 55);
	}

	function formatTime() {
		var d = new Date(),
		ta = [d.getHours(), d.getMinutes(), d.getSeconds()];
		ta = $.map(ta, function(i) {
			return i < 10 ? '0' + i : '' + i;
		});
		return ta.join(':');
	}

	function log(msg, data) {
		var extra = data ? ('<span style="font-size:10px;color:gray;">[' + (typeof(data) === 'object' ? $.param(data) : data) + ']') : '';
		$('<p class="4mu-log-info" style="white-space:nowrap;"></p>').append('<span>' + formatTime() + '</span> ' + msg).append(extra).appendTo($('#4mu-log')).get(0).scrollIntoView(true);
	}


	function initToolbar() {
		var toolbar = $('<div id="4mu-toolbar" style="background:rgba(238,238,238,0.9)"></div>').appendTo(document.body).css({
			'position': 'fixed',
			'top': 0,
			'left': 0,
			'z-index': 99999,
			'height': '150px',
			'width': '99.5%',
			'text-align': 'left',
			'font': '400 12px \'Microsoft YaHei\'',
			'background': '#ccc',
			'opacity': '0.9',
			'box-shadow': '5px 5px 3px #888'
		});
		
		$('<button style="width:130px;height:130px;margin-left:20%;margin-top:10px;font:400 26px \'Microsoft YaHei\';">����</button>').click(function() {
			this.disabled = true;
			this.innerHTML = '������';
			start();
		}).appendTo(toolbar);
		
		$('<div id="4mu-log"></div>').css({
			'position': 'absolute',
			'top': '10px',
			'right': '10px',
			'width': '65%',
			'height': '130px',
			'background': '#fcfcfc',
			'overflow': 'auto',
			'border': '1px solid #ddd'
		}).appendTo(toolbar);
		
		//��ʾʱ��
		var timebar = $('<div id="4mu-timebar"></div>').appendTo(toolbar).css({
			'position': "absolute",
			'top': '10px',
			'left': '10px',
			'width': '180px',
			'height': '90px',
			'padding-top': '40px',
			'background': '#fcfcfc',
			'overflow': 'auto',
			'border': '1px solid #ddd',
			'text-align': 'center',
			'color': '#f50',
			'font': "400 36px Arial"
		});
		timebar.html(formatTime());
		setInterval(function () {
			timebar.html(formatTime());
		}, 1000);

		log('�Һ�����������ʼ�����');
		
		//����Ƿ��¼
		if(document.cookie.indexOf('UserId') == -1) {
			log('ϵͳδ��鵽��¼��Ϣ�������ȵ�¼ϵͳ');
			alert('�����û��¼�أ����ȵ�¼��');
		}
	}

	function start() {
		log('�Һ�������');	
		loadSchedule(location.href); //for test
		QUEUE.id = setTimeout(function(){QUEUE.start();}, 200); //��1���Ӻ���������
	}

	initToolbar();

});
