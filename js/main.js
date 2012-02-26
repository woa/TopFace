/*
 * 23.02.12 by woa-IT (admin@woa-it.com)
 */

var Sys = {
	dh : 0,
	dw : 0,
	resize : function () {
		var dh = $(window).height();
		var dw = $(window).width();
		Sys.cw (dw + " | " + dh);
		this.dh = dh;
		this.dw = dw;
		
		$("#fixer").css("width", (dw-17)+"px");
		
		$("#main").css("min-height", dh+"px");
		$("#user_list").css("min-height", dh+"px");
		$("#user_list").css("max-height", dh+"px");
		$("#chat").css("min-height", dh+"px");
		
	},
	cw : function (text) {
		if (console) {
			if (console.info) {
				console.info("SYSTEM: "+text);
			} else if (console.log) {
				console.log("SYSTEM: "+text);
			}
		}
	},
	olength : function (obj) {
		var cnt = 0;
		for(var k in obj) if (obj.hasOwnProperty(k)) {
			cnt++;
		}
		return cnt;
	}
};

var Users = {};

var Dialog = {
	init : function () {
		Templates.clean.usersList();
		
		var DialogID = 1;
		
		$.each(Temp.friends, function (k,v) {
			Users[v.uid] = v;
			Templates.usersList(DialogID, v.uid);
			DialogID++;
		});
	},
	select : function (did, uid) {
		$("#user_list .active").removeClass("active");
		$("#dialog_"+did+"_"+uid).addClass("active");
		Dialog.main.init(did, uid);
	},
	remove : function (did, uid) {
		$("#dialog_"+did+"_"+uid).remove();
		$("#temp_dialog_"+did+"_"+uid).remove();
		delete Temp.dialogs[did];
		delete Dialog.main.opened[did];
		Tooltip.hide();
		var e = $('#chat > div:first').attr("id");
		if (e) {
			var c = e.split('_');
			var did = c[2];
			var uid = c[3];
			Dialog.select(did, uid);
		} else {
			$("#chat").html('<div style="padding: 10px;">No msg opend</div>');
		}
	}
};


Dialog.main = {
	opened : {},
	did : 0,
	init : function (did, uid) {
		
		Dialog.main.did = did;
		
		if (Sys.olength(this.opened) == 0) {
			Templates.clean.dialog();
		}
		
		$(document).scrollTop(0);
		
		if (!this.opened[did]) {
			this.opened[did] = 1;
			Templates.dialogInit(did, uid);
		} else {
			$("#chat .temp_dialog").hide();
			
			var temp = 
				'<div id="temp_dialog_'+did+'_'+uid+'" class="temp_dialog">'+
					$("#temp_dialog_"+did+"_"+uid).html()+
				'</div>';
				
			$("#temp_dialog_"+did+"_"+uid).remove();
			$("#chat").prepend(temp);
			
			$("#temp_dialog_"+did+"_"+uid).show();
			
			Sys.olength(Temp.dialogs[did].messages) ? Tooltip.hide() : Tooltip.show(uid);
		}
	}
};

new function($) {
  $.fn.setCursorPosition = function(pos) {
    if ($(this).get(0).setSelectionRange) {
      $(this).get(0).setSelectionRange(pos, pos);
    } else if ($(this).get(0).createTextRange) {
      var range = $(this).get(0).createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  }
}(jQuery);


var Tooltip = {
	uid : 0,
	show : function (uid) {
		this.uid = uid;
		this.gen();
		$("#tooltip").show();
	},
	hide : function () {
		$("#tooltip").hide();
	},
	gen : function () {
		var fID = 2-Temp.userInfo.sex;
		var sID = 2-Users[this.uid].sex;
		var cData = Compliments[sID][fID];
		var rand = Math.floor(Math.random()*cData.length);
		$("#compliment").html(cData[rand]);
	},
	paste : function () {
		$("#dialog_text_"+Dialog.main.did).val($("#compliment").html());
		$("#dialog_text_"+Dialog.main.did).focus().setCursorPosition($("#dialog_text_"+Dialog.main.did).val().length);
	}
};

var Templates = {
	usersList : function(did, uid) {
		
		var e = Users[uid];
		
		var html = '';
		
		var on = (e.online) ? 'on' : 'off';
		var age = parseInt((e.uid % 100) / 2);
		
		age += (age < 10) ? 10 : 0;
		
		e.age = age;
		
		html = 
			'<div class="user" id="dialog_'+did+'_'+uid+'" onMouseDown="Dialog.select('+did+', '+e.uid+');">'+
			'	<div class="fl on_off">'+
			'		<img src="img/'+on+'.png">'+
			'	</div>'+
			'	<div class="fl">'+
			'		'+e.first_name+', '+age+' '+
			'	</div>'+
			'	<div class="fr">'+
			'		<img src="'+e.photo_rec+'" class="user_avatar">'+
			'	</div>';
			
		if (Temp.dialogs[did].unread > 0) {
			
			html +=
			'	<div class="fr new_msg_cnt">'+
			'		'+Temp.dialogs[did].unread+' '+
			'	</div>';
			
		}
		
		html +=
			'	<div class="fr">'+
			'		<img src="img/del.png" class="drop_dialog" onMouseDown="event.cancelBubble = true; Dialog.remove('+did+', '+uid+'); return false;">'+
			'	</div>'+
			'	<div class="cb"></div>'+
			'</div>';
			
		$("#user_list").append(html);
	},
	dialogUser : function (uid) {
		
		var e = Users[uid];
		
		var html = '';
		
		html = 
			'<div class="dialog_user">'+
			'	<div class="fl user_avatar">'+
			'		<img src="'+e.photo_rec+'">'+
			'	</div>'+
			'	<div class="fl user_info">'+
			'		<a href="#">'+e.first_name+', '+e.age+'</a><br>'+
			'		Россия, Санкт-Питербург'+
			'	</div>'+
			'	<div class="fr user_action">'+
			'		<a href="#">Добавить в контакты</a><br>'+
			'		<a href="#">Пожаловаться</a><br>'+
			'	</div>'+
			'	<div class="cb"></div>'+
			'</div>';
		return html;
		//$("#temp_dialog_"+did).html(html);
	},
	dialogMessages : function (did, uid) {
		var html = '';
		$.each(Temp.dialogs[did].messages, function (k, v) {
			html += 
			'';
		});
		return html;
	},
	dialogInit : function (did, uid) {
		var html = '';
		var d = Temp.dialogs[did];
		
		var messages = Sys.olength(Temp.dialogs[did].messages);
		messages ? Tooltip.hide() :  Tooltip.show(uid);
		
		html = 
			'<div id="temp_dialog_'+did+'_'+uid+'" class="temp_dialog">'+
			
			Templates.dialogUser(uid) +
			/*794px*/
			'	<div class="dialog_messages'+(messages ? "" : " no_messages")+'" style="min-height: '+(Sys.dh-142)+'px;">'+
			
			((messages) ? Templates.dialogMessages(did, uid) : "") + 
			
			'	</div>'+
			
			'	<div class="dialog_write">'+
			'		<img src="img/info.png"> Хотите узнать о прочтении вашего сообщения? <a href="#">Узнать</a><br>'+
			'		<form onsubmit="return false;">'+
			'			<textarea id="dialog_text_'+Dialog.main.did+'"></textarea><br>'+
			'			<div class="fl button_blue">'+
			'				<button>Отправить</button>'+
			'			</div>'+
			'			<div class="fl send_gift">'+
			'				<img src="img/gift.png">'+
			'				<a href=#>Отправить подарок</a>'+
			'			</div>'+
			'			<div class="fl send_star">'+
			'				<img src="img/star.png">'+
			'				<a href=#>Отправить оценку</a>'+
			'			</div>'+
			'		</form>'+
			'	</div>'+
			
			'</div>'+
			'<div class="cb></div>';
		
		$("#chat .temp_dialog").hide();
		$("#chat").prepend(html);
	},
	clean : {
		dialog : function () {
			$("#chat").html("");
		},
		usersList : function () {
			$("#user_list").html("");
		}
	}
};


var Compliments = [
	[
		/*Парням*/
		[
			'Здарова мужик!',
			'Йоу мен!',
			'Гоу в CS?'
		],
		[
			'Привет, красавчик! ;)',
			'Приветик, а ты милый!',
			'Такой красавчик... ммм...'
		]
	],
	[
		/*Девушкам*/
		[
			'Ты такая красивая!',
			'Вы прекрасны!',
			'Вы - само совершентсво!'
		],
		[
			'Гламурненько!',
			'Приветик!! Как делишки?!',
			'Приветик, давай дружить?'
		]
	]
];

var Temp = {"userInfo":{"uid":2893955,"first_name":"Андрей","last_name":"Кедров","photo_medium_rec":"http:\/\/cs10458.vk.com\/u2893955\/d_c75e40b7.jpg","sex":2,"photo":"http:\/\/cs10458.vk.com\/u2893955\/e_839d8b8f.jpg"},"friends":[{"uid":175,"first_name":"Михаил","last_name":"Захаренков","photo_medium_rec":"http:\/\/cs9729.vk.com\/u00175\/d_9f1c3f8d.jpg","photo_rec":"http:\/\/cs9729.vk.com\/u00175\/e_e3a2558e.jpg","sex":2,"can_post":1,"online":0},{"uid":59219,"first_name":"Костя","last_name":"Колесников","photo_medium_rec":"http:\/\/cs10493.vk.com\/u59219\/d_8030d6c1.jpg","photo_rec":"http:\/\/cs10493.vk.com\/u59219\/e_59cd59bf.jpg","sex":2,"can_post":1,"online":0},{"uid":62312,"first_name":"Ivan","last_name":"Nikulin","photo_medium_rec":"http:\/\/cs10732.vk.com\/u62312\/d_6b53edde.jpg","photo_rec":"http:\/\/cs10732.vk.com\/u62312\/e_058659e9.jpg","sex":2,"can_post":1,"online":0},{"uid":66748,"first_name":"Олег","last_name":"Илларионов","photo_medium_rec":"http:\/\/cs4460.vk.com\/u66748\/d_ea567c89.jpg","photo_rec":"http:\/\/cs4460.vk.com\/u66748\/e_af41c356.jpg","sex":2,"can_post":0,"online":0,"lists":[27]},{"uid":76712,"first_name":"Натали","last_name":"Алдошина","photo_medium_rec":"http:\/\/cs10613.vk.com\/u76712\/d_8b75f7df.jpg","photo_rec":"http:\/\/cs10613.vk.com\/u76712\/e_6650c99e.jpg","sex":1,"can_post":1,"online":0,"lists":[27]},{"uid":97713,"first_name":"Илья","last_name":"Павлов","photo_medium_rec":"http:\/\/cs11020.vk.com\/u97713\/d_81783255.jpg","photo_rec":"http:\/\/cs11020.vk.com\/u97713\/e_6d24eedb.jpg","sex":2,"can_post":1,"online":0,"lists":[27]},{"uid":103989,"first_name":"Михаил","last_name":"Носов","photo_medium_rec":"http:\/\/cs9215.vk.com\/u103989\/d_c3effe7c.jpg","photo_rec":"http:\/\/cs9215.vk.com\/u103989\/e_e0d7b4d9.jpg","sex":2,"can_post":1,"online":0,"lists":[27]},{"uid":106079,"first_name":"Павел","last_name":"Мишин","photo_medium_rec":"http:\/\/cs4301.vk.com\/u106079\/d_fa7956ba.jpg","photo_rec":"http:\/\/cs4301.vk.com\/u106079\/e_76288c82.jpg","sex":2,"can_post":0,"online":0,"lists":[27]},{"uid":169003,"first_name":"Глеб","last_name":"Климов","photo_medium_rec":"http:\/\/cs9783.vk.com\/u169003\/d_8018e98e.jpg","photo_rec":"http:\/\/cs9783.vk.com\/u169003\/e_5809d4f7.jpg","sex":2,"can_post":1,"online":1},{"uid":326683,"first_name":"Сергей","last_name":"Черный","photo_medium_rec":"http:\/\/cs5144.vk.com\/u326683\/d_68786c94.jpg","photo_rec":"http:\/\/cs5144.vk.com\/u326683\/e_333b5163.jpg","sex":2,"can_post":1,"online":1},{"uid":418841,"first_name":"Никита","last_name":"Щов","photo_medium_rec":"http:\/\/cs9934.vk.com\/u418841\/d_51c645f2.jpg","photo_rec":"http:\/\/cs9934.vk.com\/u418841\/e_bfc63d0d.jpg","sex":2,"can_post":1,"online":0},{"uid":463377,"first_name":"Денис","last_name":"Пешехонов","photo_medium_rec":"http:\/\/cs11436.vk.com\/u463377\/d_86f550e6.jpg","photo_rec":"http:\/\/cs11436.vk.com\/u463377\/e_8391d68d.jpg","sex":2,"can_post":1,"online":1},{"uid":1198614,"first_name":"Кирилл","last_name":"Александров","photo_medium_rec":"http:\/\/cs4143.vk.com\/u1198614\/d_8cf0d716.jpg","photo_rec":"http:\/\/cs4143.vk.com\/u1198614\/e_dd8148c1.jpg","sex":1,"can_post":1,"online":0}]};

Temp.dialogs = {
	1 : {
		messages : [
			{
				text : 'привет как дела',
				date : 1268238448,
				mid : 1,
				out : 0,
				read_state : 1,
				type : 1
			},
			{
				text : 'привет',
				date : 1268238558,
				mid : 2,
				out : 1,
				read_state : 1,
				type : 1
			},
			{
				text : '8',
				date : 1268238668,
				mid : 3,
				out : 1,
				read_state : 1,
				type : 2
			},
			{
				text : '10',
				date : 1268238778,
				mid : 4,
				out : 1,
				read_state : 1,
				type : 3
			},
			{
				text : 'привет',
				date : 1268238858,
				mid : 2,
				out : 1,
				read_state : 1,
				type : 1
			},
			{
				text : 'привет',
				date : 1268238958,
				mid : 2,
				out : 1,
				read_state : 1,
				type : 1
			},
			{
				text : 'привет',
				date : 1268239058,
				mid : 2,
				out : 1,
				read_state : 1,
				type : 1
			}
		],
		unread : 0
	},
	2 : {
		messages : {
			101 : {
				
			}
		},
		unread : 10
	},
	3 : {
		messages : {
			
		},
		unread : 10
	},
	4 : {
		messages : {
			
		},
		unread : 10
	},
	5 : {
		messages : {
			
		},
		unread : 10
	},
	6 : {
		messages : {
			
		},
		unread : 10
	},
	7 : {
		messages : {
			
		},
		unread : 10
	},
	8 : {
		messages : {
			
		},
		unread : 10
	},
	9 : {
		messages : {
			
		},
		unread : 10
	},
	10 : {
		messages : {
			
		},
		unread : 10
	},
	11 : {
		messages : {
			
		},
		unread : 10
	},
	12 : {
		messages : {
			
		},
		unread : 10
	},
	13 : {
		messages : {
			
		},
		unread : 10
	}
}