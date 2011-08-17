/*
4mu
*/

$(document).ready(function() {

	var URL_DEPARTMENT = 'http://guahao.zjol.com.cn/DepartMent.Aspx?ID=853'; //��������ר�Ҷ�¥
	var URL_RESUMENUM = 'http://guahao.zjol.com.cn/ashx/getResumeNum.ashx';  //ȡ����ź�ȡ��ʱ��
	var URL_RESUMEQR = 'http://guahao.zjol.com.cn/ashx/getResumeQR.ashx'  //ȡ�ùҺ���Ϣ

	//����ҳ�����ݣ� ��ȡҳ��ȡ�ÿ�ԤԼ����������
	function loadSchedule(url) {  
		$.ajax({
			type: 'get',
			url: url || URL_DEPARTMENT,
			cache: false,
			error: function() {
				//todo: ����3��05��֮ǰ����������
				alert('retry1');
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
				var re = /javascript:showDiv\(([0-9\',]+)\)/ig;
				var ret, idArray = [];
				while ((ret = re.exec(html)) != null) {
					idArray[idArray.length] = $.map(ret[1].split(','), function(item) { //�Ƴ���β������
						return item.substring(1, item.length-1);
					});
				}
				if (idArray.length > 0) {
					getResumeNum(idArray);
				} else {
					//todo: ����3��05��֮ǰ����������
					alert('retry2');
				}
			}
		});
	}
	
	/**
	ȡ����ź͹Һ�ʱ��
	*/ 
	function getResumeNum(idArray) {
		if (idArray && idArray.length > 0) {
			var data = {
				'SchId': idArray[0][0],
				'DateTime': idArray[0][1],
				'DateType': idArray[0][2],
				'HosID': idArray[0][3],
				'DepID': idArray[0][4],
				'DocID': idArray[0][5]
			}
			$.ajax({
				type: "POST",
				url: URL_RESUMENUM,
				data: data,
				success:function(result) {
					//��ʽe.g.  $2891076|11|1400$2891077|12|1406$2891078|13|1412$2891079|14|1418$2891080|15|1424
					if (result) {
						getResumeQR(result);
					} else {
						idArray.shift();
						getResumeNum(idArray);
					}
				}
			});
		} 
	}
	
	/**
	��ȡ�Һ�����Ϣ
	*/
	function getResumeQR(ret) {
		var qrs = ret.substring(1).split('$');
		if (qrs.length > 0) {
			var qr = qrs[0].split('|');
			var data = {
				NUM: qr[0],
				XH: qr[1],
				S: qr[2]
			}
			$.ajax({
					type: "POST",
					url: URL_RESUMEQR,
					data: data,
					success:function(result) {
						goodLucky(result);
					}
			});
		}
	}

	/**
	���һ��
	*/
	function goodLucky(result) {
		var data = result.split('|');
		if (data.length > 0 && window.showYycg) { //ֱ�ӵ���ҳ���ϵ� showYycg ����
			alert('�ɹ���!');
			//window.showYycg(data[9], data[8], data[10], data[11]);
		}
	}

	function initToolbar() {
		var toolbar =$('<div id="4mu-toolbar"></div>').appendTo(document.body).css({
			'position': 'fixed',
			'top': 0,
			'left': 0,
			'height': '150px',
			'width': '99%',
			'background':'rgba(238,238,238,0.9)',
			'box-shadow': '5px 5px 3px #888'
		});

		toolbar.html('<button>Go</button>').click(function() {
			loadSchedule(location.href);
		});
	}

	initToolbar();

});

