/*
4mu
*/

$(document).ready(function() {

	var LOGIN_WARN = '用户未登录';
	var URL_DEPARTMENT = 'http://guahao.zjol.com.cn/DepartMent.Aspx?ID=853'; //妇保产科专家二楼
	var URL_RESUMENUM = 'http://guahao.zjol.com.cn/ashx/getResumeNum.ashx';  //取得序号和取号时间
	var URL_RESUMEQR = 'http://guahao.zjol.com.cn/ashx/getResumeQR.ashx';  //取得挂号信息
	var URL_TREADRESUME = 'http://guahao.zjol.com.cn/ashx/TreadResume.ashx'; //挂号确认

	//分析页面内容， 读取页面取得可预约的排期数据
	function loadSchedule(url) {  
		log('查找 ' + location.href + ' 中的预约信息......');
		var re = /javascript:showDiv\(([0-9\',]+)\)/ig;
		var idArray = [];
		$.ajax({
			type: 'get',
			url: url || URL_DEPARTMENT,
			cache: false,
			timeout: 3000,
			complete: function(xhr, status) {
				if(idArray.length < 1) {
					if (canRetry()) { //下午3点03分之前，反复重试
						log('没有可用预约, 重试中......');
						setTimeout(function() {
							loadSchedule(url);
						}, 200);
					} else {
						log('没有可用预约，且已过15:03分，放弃重试');
					}
				}
			},
			success:function(html) {
				/* 取得预约参数
					SchId: 日程ID
					DateTime: 日期yyyymmdd
					DateType: 0上午 1下午
					HosID: 医院ID
					DepID: 科室ID
					DocID: 医生ID
				*/
				var ret;
				while ((ret = re.exec(html)) != null) {
					idArray[idArray.length] = $.map(ret[1].split(','), function(item) { //移除首尾的引号
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
	取得序号和挂号时间
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
		log('获取挂号序号/时间信息', data);
		$.ajax({
			type: "POST",
			url: URL_RESUMENUM,
			data: data,
			error: function() {
				log('获取挂号序号/时间信息遇到服务器错误', data);
				if(canRetry()) {
					log('重试获取挂号序号/时间信息', data);
					setTimeout(function() {
						getResumeNum(ids);
					}, 200);
				}					
			},
			success:function(result) {
				//格式e.g.  $2891076|11|1400$2891077|12|1406$2891078|13|1412$2891079|14|1418$2891080|15|1424
				if (result) {
					if (result == LOGIN_WARN) { //没有登录
						log(result);
						alert('请首先登录系统')
						return;
					}
					getResumeQR(result);
				} else {
					log('无法获取挂号序号/时间信息', data);
				}
			}
		});
	}
	
	/**
	获取挂号者信息
	*/
	function getResumeQR(ret) {
		var qrs = ret.substring(1).split('$');
		if (qrs.length > 0) {
			//循环获取所有可能的序号
			$.each(qrs, function(index, qr) {
				setTimeout(function() {
					var qra = qr.split('|');
					var data = {
						NUM: qra[0],
						XH: qra[1],
						S: qra[2]
					}
					_getResumeQR(data);				
				}, 500*index*index); //避免频繁访问,间隔时间加长
			});
		}
	}

	function _getResumeQR(data) {
		log('获取挂号者确认信息', data);
		$.ajax({
				type: "POST",
				url: URL_RESUMEQR,
				data: data,
				error: function() {
					log('获取挂号者信息遇到服务器错误', data);
					if(canRetry()) {
						log('重试获取挂号者信息', data);
						setTimeout(function() {
							_getResumeQR(data);
						}, 200);
					}					
				},
				success:function(result) {
					addToQueue(result); //加入申请队列
				}
		});
	}


	/**
	加入到请求队列
	*/
	function addToQueue(result) {
		var data = result.split('|');
		if (data.length > 0) { 
			var qdata = [data[9], data[8], data[10], data[11]];
			QUEUE.add(qdata);
		}
	}

	/**
		发送最终请求
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
					alert('手气不错，挂号成功!');
					if (confirm('马上去查看预约记录?')) {
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
				log('挂号队列已取消');
				return;
			}
			this.q.push(data);
			log('加入挂号申请请求队列', data.join(','));
		},
		run: function() {
			if (!this.q) {
				log('挂号队列已取消');
			} else {
				if (this.q.length > 0) {
					var cq = this.q.shift();
					log('向服务器发送挂号申请确认', cq.join(','));
					goodLucky(cq, function(ok){ /* callback */
						if (ok) {
							log('搞定了！挂号申请成功，队列取消');
							QUEUE.stop();
						} else {
							log('本次申请未成功，重试队列下一个请求');
							QUEUE.q.push(cq); //重新加入队列
							QUEUE.id = setTimeout(function() {QUEUE.run();}, 100);
						}
					});
				} else {
					if(canRetry()) {
						log('挂号队列没有申请请求，等待......');
						this.id = setTimeout(function() {QUEUE.run();}, 500);
					} else {
						log('没有挂号申请，且已过15:03分，队列取消');
						this.stop();
					}
				}
			}			
		},
		start: function() {
			log('启用挂号申请队列');
			this.q = [];
			this.run();
		},
		stop: function() {
			log('停止挂号申请队列');
			clearTimeout(this.id);
			this.q = null;
		}
	};  //队列全局对象


	//是否需要重试（下午3点3分以后，不再重试）
	function canRetry() {
		/* 10次重试 for test
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
		
		$('<button style="width:130px;height:130px;margin-left:20%;margin-top:10px;font:400 26px \'Microsoft YaHei\';">启动</button>').click(function() {
			this.disabled = true;
			this.innerHTML = '运行中';
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
		
		//显示时间
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

		log('挂号器工具条初始化完毕');
		
		//检查是否登录
		if(document.cookie.indexOf('UserId') == -1) {
			log('系统未检查到登录信息，请首先登录系统');
			alert('你好像还没登录呢，请先登录！');
		}
	}

	function start() {
		log('挂号器启动');	
		loadSchedule(location.href); //for test
		QUEUE.id = setTimeout(function(){QUEUE.start();}, 200); //近1秒钟后启动队列
	}

	initToolbar();

});
