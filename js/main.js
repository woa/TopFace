function return_false () {
	return false;
}

var Listener = {
	channels_url : 'http://sea.tlov.ru/events?cid=',
	successTimeout : 1000,
    failureTimeout : 0,
	channels : {},
	add : function (cid, success, error) {
		var data = {
			etag : 0,
			lastModified : HASH_TIME,
			launched : false,
			failure : false,
			stopped : false,
			ajaxData : {
		        url : Listener.channels_url+cid,
		        type : 'GET',
		        async : true,
		        error : error,
		        success : success,
		        dataType : 'json',
		        complete : function (data) {Listener.onComplete(cid, data)},
		        beforeSend : function (data) {Listener.beforeSend(cid, data)},
		        timeout: 1000 * 20 
		    }
		};
	    Listener.channels[cid] = data;
	    $.ajax(data.ajaxData);
	},
	del : function (cid) {
		cw("DEL => "+cid);
		Listener.channels[cid].stopped = 1;
		Listener.channels[cid].ajax.abort();
	},
	onComplete : function (cid, jqXHR) {
		var l = Listener;
		var c =  l.channels[cid];
		if (c.stopped) {
			cw("STOP => "+cid);
			delete l.channels[cid];
			return false;
		}
		if (jqXHR.getResponseHeader('Etag') != null && jqXHR.getResponseHeader('Last-Modified') != null) {
	        c.etag = jqXHR.getResponseHeader('Etag');
	        c.lastModified = jqXHR.getResponseHeader('Last-Modified');
		}
        c.ajax = $.ajax(c.ajaxData);
    },
    beforeSend : function (cid, jqXHR) {
    	var c =  Listener.channels[cid];
        jqXHR.setRequestHeader("If-None-Match", c.etag);
        jqXHR.setRequestHeader("If-Modified-Since", c.lastModified);
    }
};


var RPL = {
	data : [],
	init : function (resp) {
		if (resp) {
			RPL.conf(resp);
		}
	},
	conf : function (data) {
		if (data.type) {
			var dt = Math.floor(data.type / 100);
			if (dt == 1) {
				var uid = data.msg.uid;
				if (uid != User.uid) {
					if (data.type == 101) {
						if (Users[uid]) {
							$("#dialog_"+uid+" .on_off").html('<img src="img/on.png">');
							if (Users[uid].is_friend == 1) {
								var is_avtive = ($("#dialog_"+uid).hasClass("active")) ? "active" : "";
								html = $("#dialog_"+uid).html();
								var q = {
									is_avtive : is_avtive,
									uid : uid,
									text : html
								};
								html = TR("selectDialog", q);
								$("#dialog_"+uid).remove();
								$("#usersBlock1").prepend(html);
							}
						} else {
							v = Dialog.prepareUsers(data.msg);
							Users[uid] = v;
							$("#usersBlock3").prepend(TR("usersListUser", v));
							Sys.initUserList();
						}
					} else {
						//v = Dialog.prepareUsers(v); оффлайн
						if (Users[uid]) {
							if (Users[uid].is_friend == 1) {
								var is_avtive = ($("#dialog_"+uid).hasClass("active")) ? "active" : "";
								html = $("#dialog_"+uid).html();
								var q = {
									is_avtive : is_avtive,
									uid : uid,
									text : html
								};
								html = TR("selectDialog", q);
								$("#dialog_"+uid).remove();
								$("#usersBlock2").prepend(html);
							} else if (Dialog.rid2did[uid]) {
								$("#dialog_"+uid+" .on_off").html('<img src="img/off.png">');
							} else {
								$("#dialog_"+uid).remove();
							}
						}
					}
				}
			} else if (dt == 2) {
				if (data.type == 201) {
					if (data.msg && data.msg.uid) {
						var uid = data.msg.uid;
						if (!Dialog.rid2did[uid]) Dialog.rid2did[uid] = data.msg.did;
						if (!Dialog.main.opened[uid]) {
							Dialog.incCounter(uid);
						} else {
							data.msg.text = data.msg.text.split('\\n').join("\n");
							Dialog.main.message(data.msg);
							if (Dialog.storage.uid != data.msg.uid) {
								Dialog.incCounter(uid);
							} else {
								$$("ajax.php", {act: "set_as_read", rid : uid, mid : data.msg.mid}, Sys.cw);
							}
						}
					}
				}
			}
		}
	}
};

var $$ = function (url, post, c, bg) {
	if (!c) {
		c = post;
		post = {};
	}
	
	post.uid = User.uid;
	post.hash = User.hash;

	$$.ajax = {};
	
	if (post.act && post.act == "get_dialog_msg") {
		$("#dialog_"+post.rid+"_preloader").fadeIn(0);
		
		if ($$.ajax && $$.ajax.rid) {
			$$.ajax.query.abort();
			$("#dialog_"+$$.ajax.rid+"_preloader").fadeOut(0);
		}
		$$.ajax = {
			rid : post.rid
		};
	} else {
		
		if (post.act && post.act == "send_msg" && !post.type) {
			$$.ajax = {
				mid : post.mid,
				uid : post.rid
			};
			if (!Storage.messages[post.rid]) Storage.messages[post.rid] = [];
			Storage.messages[post.rid][post.mid] = post;
		}
	}
	cw(cp(post));
	$$.ajax.query = $.ajax({
		url : url, 
		type: "POST",
		data : post, 
		dataType : "json",
		error : function(jqXHR, textStatus) { 
			if ($$.ajax && $$.ajax.mid) {
				if (Sys.olength(Storage.messages[$$.ajax.uid])) {
					$("#message_status_"+$$.ajax.uid+" .msg_status").hide();
					$("#message_status_"+$$.ajax.uid+" .msg_repost").show();
				}
				if (Storage.messages_queries[$$.ajax.mid]) {
					delete Storage.messages_queries[$$.ajax.mid];
				}
			}
		},
		success : function (data) {
			if (data) {
				c(data.resp);
				if (post.act && post.act == "get_dialog_msg") {
					$("#dialog_"+post.rid+"_preloader").fadeOut(0);
				}
			}
			if ($$.ajax && $$.ajax.mid && Storage.messages_queries[$$.ajax.mid]) {
				delete Storage.messages_queries[$$.ajax.mid];
			}
		}
	});
	if (post.act && post.act == "send_msg" && !post.type) {
		Storage.messages_queries[post.mid] = $$.ajax.query;
	}
};

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
		$("#user_list_fix").css("height", dh+"px");
		$("#user_list").css("min-height", dh+"px");
		$("#chat").css("min-height", dh+"px");
		
	},
	ndh : function () {
		return $(window).width();
	},
	cw : function (text) {
		if (typeof(console) != 'undefined') {
			if (console.info) {
				console.info("SYSTEM: "+text);
			} else if (console.log) {
				console.log("SYSTEM: "+text);
			}
		}
	},
	olength : function (obj) {
		var cnt = 0;
		if (obj && typeof(obj) == "object") {
			for(var k in obj) if (obj.hasOwnProperty(k)) {
				cnt++;
			}
		}
		return cnt;
	},
	time : function (t) {
		var d = new Date(t*1000);
		var h = d.getHours();
		var m = d.getMinutes();
		
		if (h < 10) h = '0'+h;
		if (m < 10) m = '0'+m;
		
		t = h+":"+m;
		
		return t;
	},
	user_width: 0,
	mid_width : 40,
	getWidth : function (uid) {
		if (Sys.user_width == 0) {
			Sys.user_width = $("#user_width").width();
			if (Sys.user_width < this.mid_width) Sys.user_width = this.mid_width;
		}
		var width = $("#user_login_"+uid).width();
		if (width < Sys.user_width) width = Sys.user_width;
		return width;
	},
	strip_tags : function ( str ) {
	    return str.replace(/<\/?[^>]+>/gi, '');
	},
	firstElem : function (obj, del) {
		if (obj && typeof(obj) == "object") {
			for(var k in obj) if (obj.hasOwnProperty(k)) {
				var data = obj[k];
				if (del) {
					delete obj[k];
				}
				return data;
			}
		}
		return false;
	},
	initUserList : function () {
		if ($("#user_list").height() > Sys.dh) {
			$("#user_list").css("padding", "52px 0");
			$("#scroll_top").show();
			$("#scroll_bot").show();
		} else {
			$("#user_list").css("padding", "0px");
			$("#scroll_top").hide();
			$("#scroll_bot").hide();
		}
	}
};

var SendMark = function (e, type){
	var mark = (type) ? e : $(e).attr("id").split("_")[1];
	var uid = Dialog.storage.uid;
	
	var k = -parseInt(new Date().getTime().toLocaleString().split(" ").join(""));

	var data = {
		act: "send_msg",
		rid: uid,
		text: parseInt(mark),
		type: (type || 2),
		mid: k
	};
	
	$$("ajax.php", data, SendMark.close);
};

SendMark.close = function (data) {
	cw(cp(data));
	Modal.close();
	
	var uid = Dialog.storage.uid;
	var e = $("#dialog_text_"+uid);
		
	var width = Dialog.storage.width;
	if (!width) {
		width = Sys.getWidth(uid);
		var mWidth = 491-width;
		Dialog.storage.width = width;
		Dialog.storage.mWidth = mWidth;
	} else {
		var mWidth = Dialog.storage.mWidth;
	}
	
	if (data.type > 1) {
		if (data.type == 2 && data.text > User.average_mark) {
			data.type = 3;
		}
		User.average_mark = ((User.marks_count * User.average_mark ) + data.text ) / (++User.marks_count);
	}
	
	var v = {
		mid : data.mid,
		is_out : "out",
		type : data.type,
		text : data.text,
		sender : User.first_name,
		width : width,
		mWidth : mWidth,
		loading : Sys.time(data.date)
	};
	
	v.out = 1;
	v.text = Dialog.main.getMark(v);

	$("#temp_dialog_"+uid+" .dialog_messages").append(TR("message", v));
	setTimeout("$(window).scrollTop(Sys.ndh())", 10);
}

var Modal = {
	show : function (type, id) {
	
		var html = '';
		var uid = Dialog.storage.uid;
		var rn = new RussianName('', Users[uid].first_name);
		var pred = rn.fullName(rn.gcaseDat);
		var v = {};
		var m = {
			modal_height : Sys.dh-103
		};
		
		if (type == 1) {
			v.user = pred;
			m.modal_class = 'votes';
			m.modal_text = TR("modal_votes", v);
		}
		else if (type == 2) {
			var parentDiv = $(id).parent().parent();
			v.mid = parentDiv.attr("id").split("_")[1];
			v.text = parentDiv.find(".msg").text();
			v.text = formatMessage(v.text);
			if (v.text.length > 85) {
				v.text = v.text.substr(0,85) + "…";
			}
			
			
			m.modal_class = 'del_message';
			m.modal_text = TR("modal_delete", v);
		}
		html = TR("modal", m);
		$("#chat").append(html);
		$("#modal").fadeIn(400);
	},
	close : function () {
		$("#modal").fadeOut(400, function () {$(this).remove();});
	}
};

var Votes = {
	show : function () {
		Modal.show(1);
	}
};

var Users = {};

var cw = function (text, i) {
	if (console) {
		if (i) {
			CW_CNT++;
		}
		//text = str_replace('%2C', ',', text);
		if (console.info) {
			console.info("SYSTEM: "+text);
		} else if (console.log) {
			console.log("SYSTEM: "+text);
		}
	}
};

function cp (obj, objName, tab) 
{
  var result = "";
  
  if (!tab) {
	  tab = "\t";
	  result = "The properties for the " + objName + " object:" + " \n";
  }
  else {
	  tab += "\t";
  }
  
  
  for (var i in obj) {
	  
	  if (typeof(obj[i]) == 'object') {
		  result += tab + i + " => \n" + cp(obj[i], i, tab);
	  } else {
		result += tab + i + " => " + obj[i] + "\n";
	  }
	  
  }
  
  return result;
}

var Storage = {
	dialogs : {},
	messages : {},
	messages_queries : {}
};

var Dialog = {
	list : [],
	rid2did : {},
	storage : {
		did : 0,
		uid : 0
	},
	get : function () {
		var data = {
			act : "get_dialogs"
		};
		$$("ajax.php", data, Dialog.init);
	},
	init : function (data) {
		Templates.clean.usersList();
		Dialog.list = [];
		var html = "";
		html += TR("usersListBlock", {type: 1, name : Templates.friendsOnline});
		html += Dialog.formatData(data.on, 1);
		
		html += TR("usersListBlock", {type: 2, name : Templates.friendsOffline});
		html += Dialog.formatData(data.off, 2);
		
		html += TR("usersListBlock", {type: 3, name : Templates.onlineUsersList});
		html += Dialog.formatData(data.all, 3);
		
		$("#user_list").append(html);
		
		Sys.initUserList();
		
	},
	formatData : function (data, type) {
		var html = '<div id="usersBlock'+type+'">';
		$.each(data, function (k,v) {
			v = Dialog.prepareUsers(v);
			Users[v.uid] = v;
			html += TR("usersListUser", v);
		});
		html += '</div>';
		return html;
	},
	prepareUsers : function (v) {
		if (v.dialog.did) {
			Dialog.rid2did[v.uid] = v.dialog.did;
		}
		if (v.dialog['new'] && v.dialog['new'] > 0) {
			v.unread_visibility = "";
			v['new'] = v.dialog['new'];
		} else {
			v.unread_visibility = "ndsp";
			v['new'] = 0;
		}
		if (v.online == 0) {
			v.online_status = "off";
		} else {
			v.online_status = "on";
		}
		return v;
	},
	select : function (uid) {
		Dialog.storage.uid = uid;
		$("#user_list .active").removeClass("active");
		$("#dialog_"+uid).addClass("active");
		Dialog.main.init();
	},
	remove : function (uid) {
		$("#dialog_"+uid).remove();
		$("#temp_dialog_"+uid).remove();
		delete Dialog.main.opened[uid];
		Tooltip.hide();
		var e = $('#chat > div:first').attr("id");
		if (e) {
			var c = e.split('_');
			var uid = c[2];
			Dialog.select(uid);
		} else {
			$("#chat").html(Templates.noMessages);
		}
	},
	incCounter : function (uid) {
		var e = $("#dialog_"+uid+" .new_msg_cnt");
		e.html(parseInt($(e).html())+1);
		e.stop(1,1).fadeIn("slow");
	},
	post : function () {
		var uid = Dialog.storage.uid;
		var e = $("#dialog_text_"+uid);
		var msg = Sys.strip_tags(e.val());
		if (msg.length < 1) {
			return false;
		} else {
			
			var width = Dialog.storage.width;
			if (!width) {
				width = Sys.getWidth(uid);
				var mWidth = 491-width;
				Dialog.storage.width = width;
				Dialog.storage.mWidth = mWidth;
			} else {
				var mWidth = Dialog.storage.mWidth;
			}
			var k = -parseInt(new Date().getTime().toLocaleString().split(" ").join(""));
			
			var data = {
				act : "send_msg",
				rid : uid,
				text : msg,
				mid : k
			};
			
			e.val("");
			
			
			var template_name;
			var v = {
				mid : k,
				is_out : "out",
				type : 1,
				text : msg.split("\n").join("<br>"),
				sender : User.first_name,
				width : width,
				mWidth : mWidth,
				loading : Templates.loader
			};

			$("#temp_dialog_"+uid+" .dialog_messages").append(TR("message", v));
			setTimeout("$(window).scrollTop(Sys.ndh())", 10);
			if (!Dialog.rid2did[uid]) {
				Tooltip.hide();
				$("#temp_dialog_"+uid+" .dialog_messages").removeClass("no_messages");
				$("#temp_dialog_"+uid+" .dialog_write").removeClass("no_messages");
			}
			$$("ajax.php", data, Dialog.afterPost);
		}
	},
	afterPost : function (data) {
		if (data.mid) {
			var uid = data.rid;
			if (!Dialog.rid2did[uid]) {Dialog.rid2did[uid] = data.did;}
			$("#msg_"+data.old).attr("id", "msg_"+data.mid);
			$("#msg_"+data.mid + " .time").html(Sys.time(data.date));
			if (Storage.messages[uid][data.old]) delete Storage.messages[uid][data.old];
			setTimeout("$(window).scrollTop(Sys.ndh())", 10);
		}
	},
	repost : function () {
		var uid = Dialog.storage.uid;
		var data = Sys.firstElem(Storage.messages[uid], 1);
		if (data) {
			if (!Sys.olength(Storage.messages[uid])) {
				$("#message_status_"+uid+" .msg_status").show();
				$("#message_status_"+uid+" .msg_repost").hide();
			}
			$$("ajax.php", data, Dialog.afterPost);
		}
	}
};

Dialog.main = {
	initialized : 0,
	opened : {},
	did : 0,
	uid : 0,
	init : function (did, uid) {
		var uid = Dialog.storage.uid;
		if (Dialog.main.initialized == 0) {
			Dialog.main.initialized = 1;
			Templates.clean.dialog();
		}
		
		if (Dialog.main.opened[uid]) {
			Dialog.main.show();
		} else if (!Dialog.rid2did[uid]) {
			Dialog.main.show();
		} else {
			var data = {
				act : "get_dialog_msg",
				rid : uid
			}
			$$("ajax.php", data, Dialog.main.show);
		}
	},
	show : function (data) {
		if (!data) data = {};
		var uid = Dialog.storage.uid;
		if (!Dialog.main.opened[uid]) {
			Dialog.main.opened[uid] = 1;
			Dialog.main.format(data);
		} else {
			$("#chat .temp_dialog").fadeOut(0);
			var q = {
				uid : uid,
				text : $("#temp_dialog_"+uid).html()
			};
			var temp = TR("tempDialogMove", q);
			var old_msg = $("#dialog_text_"+uid).val();
			$("#temp_dialog_"+uid).remove();
			$("#chat").prepend(temp);
			$("#dialog_text_"+uid).val(old_msg); /*fix for textarea*/
			$("#temp_dialog_"+uid).fadeIn(0);
			(Dialog.rid2did[uid]) ? Tooltip.hide() : Tooltip.show(uid);
			setTimeout("$(window).scrollTop(Sys.ndh())", 1);
		}
	},
	format : function (data) {
		var uid = Dialog.storage.uid;
		var is_new = 1;
		if (data) {
			Storage.dialogs[uid] = data;
		} else {
			data = Storage[uid];
		}

		(Dialog.rid2did[uid]) ? Tooltip.hide() : Tooltip.show(uid);
		
		var html = '';
		
		if (parseInt($("#dialog_"+uid+" .new_msg_cnt").html()) > 0) {
			$$("ajax.php", {act: "set_as_read", rid : uid}, Sys.cw);
			$("#dialog_"+uid+" .new_msg_cnt").stop(1,1).fadeOut("slow", function () {$(this).html(0);} );
		}
		var u = Users[uid];
		
		if (u.is_friend == 1) {
			friend_action = "Friend.del();";
			friend_action_text = Templates.friendDelName;
		} else {
			friend_action = "Friend.add();";
			friend_action_text = Templates.friendAddName;
		}
		
		var v = {
			uid : u.uid,
			photo : u.photo,
			first_name : u.first_name,
			age : u.age,
			country : u.country,
			city : u.city,
			friend_action : friend_action,
			friend_action_text : friend_action_text
		};
		
		var messages = (Dialog.rid2did[uid]) ? Dialog.main.messages() : "";
		
		var d = {
			uid : uid,
			userInfo : TR("userInfo", v),
			messages : messages,
			is_new : (Dialog.rid2did[uid]) ? "" : "no_messages",
			height : Sys.dh-122-180
		};
		
		html += TR("dialogInit", d);
		
		$("#chat .temp_dialog").fadeOut(0);
		$("#chat").prepend(html);
		$('textarea').die();
		$('textarea').live('keydown', function(e) {
		  if (e.ctrlKey && e.keyCode === 13) {
		    Dialog.post();
		  }
		});
		setTimeout("$(window).scrollTop(Sys.ndh())", 1);
	},
	messages : function (data) {
		var html = '';
		var uid = Dialog.storage.uid;
		var d = Storage.dialogs[uid];
		var width = Sys.getWidth(uid);
		var mWidth = 491-width;
		
		Dialog.storage.width = width;
		Dialog.storage.mWidth = mWidth;
		
		if (!data) {
			data = d.messages;
		}
		
		$.each(data, function (k, v) {
			if (v.mid) {
				v = Dialog.main.messagePrepare(v, uid, width, mWidth);
				html = TR("message", v) + html;
			}
		});
		return html;
	},
	message : function (v) {
		var html = '';
		var uid = v.uid;
		var d = Storage.dialogs[uid];
		var width = Sys.getWidth(uid);
		var mWidth = 491-width;
		
		if (v.mid) {
			v = Dialog.main.messagePrepare(v, uid, width, mWidth);
			html = TR("message", v) + html;
		}
		$("#temp_dialog_"+uid+" .dialog_messages").append(TR("message", v));
		setTimeout("$(window).scrollTop(Sys.ndh())", 1);
	},
	messagePrepare : function (v, uid, w, mw) {
		v.width = w;
		v.mWidth = mw;
		if (v.out == 1) {
			v.is_out = "out";
			v.sender = User.first_name;
		} else {
			v.is_out = "";
			v.sender = Users[uid].first_name;
		}
		v.loading = Sys.time(v.date);
		v.text = Dialog.main.getMark(v);
		v.text = v.text.split("\n").join("<br>");
		return v;
	},
	getMark : function (v) {
		var uid = Dialog.storage.uid;
		if (v.type == 2) {
			if (v.out == 1) {
				var sex = Templates.estimated[User.sex];
				var q = {text : v.text, sex : sex};
				v.text = TR("appreciated", q);
			} else {
				var q = {text : v.text};
				v.text = TR("rated", q);
			}
		} else if (v.type == 3) {
			if (v.out == 1) {
				var sex = Templates.simpatico[User.sex];
				var q = {sex : sex};
				v.text = TR("prettier", q);
			} else {
				var sex = Templates.like[User.sex];
				var q = {sex : sex};
				v.text = TR("liked", q);
			}
		} else if (v.type == 4) {
			if (v.out == 1) {
				v.text = Templates.mutualSympathy;
			} else {
				v.text = Templates.mutualSympathyGift;
			}
		}
		return v.text;
	}
};

var Tooltip = {
	uid : 0,
	show : function (uid) {
		this.uid = uid;
		this.gen();
		$("#tooltip").fadeIn(0);
	},
	hide : function () {
		$("#tooltip").fadeOut(0);
	},
	gen : function () {
		var fID = 2-User.sex;
		var sID = 2-Users[Tooltip.uid].sex;
		var cData = Compliments[sID][fID];
		var rand = Math.floor(Math.random()*cData.length);
		$("#compliment").html(cData[rand]);
	},
	paste : function () {
		var uid = Dialog.storage.uid;
		var e = $("#dialog_text_"+uid);
		e.val($("#compliment").html());
		e.focus().setCursorPosition(e.val().length);
	}
};

var Friend = {
	add : function () {
		var uid = Dialog.storage.uid;
		var data = {
			act : 'friend_add',
			fid : uid
		};
		$$("ajax.php", data, Sys.cw);
		var html = '';
		Users[uid].is_friend = 1;
		$("#user_action_"+uid).html(Templates.friendDel);
		html = $("#dialog_"+uid).html();
		var v = {uid : uid, html : html};
		html = TR("friendBlock", v);
		$("#dialog_"+uid).remove();
		if (Users[uid].online == 1) {
			$("#usersBlock1").prepend(html);
		} else {
			$("#usersBlock2").prepend(html);
		}
	}, 
	del : function () {
		var uid = Dialog.storage.uid;
		var data = {
			act : 'friend_del',
			fid : uid
		};
		$$("ajax.php", data, Sys.cw);
		var html = '';
		Users[uid].is_friend = 0;
		$("#user_action_"+uid).html(Templates.friendAdd);
		html = $("#dialog_"+uid).html();
		var v = {uid : uid, html : html};
		html = TR("friendBlock", v);
		$("#dialog_"+uid).remove();
		$("#usersBlock3").prepend(html);
	}
};

var Message = {
	remove : function (mid) {
		var uid = Dialog.storage.uid;
		if (mid < 0 && Storage.messages[uid][mid]) {
			if (Storage.messages_queries[mid]) {
				Storage.messages_queries[mid].abort();
				delete Storage.messages_queries[mid];
			}
			if (Storage.messages[uid] && Storage.messages[uid][mid]) delete Storage.messages[uid][mid];
		}
		$("#msg_"+mid+" .msg").html(Templates.msgDropped);
		$("#msg_"+mid).addClass("dropped");
		Modal.close();
		var data = {
			act : "drop_message",
			mid : mid,
			rid : uid
		};
		$$("ajax.php", data, Sys.cw);
	}
};

function ToggleUsersBlock (e, type) {
	
	$("#usersBlock"+type).stop(1,1);
	
	if ($("#usersBlock"+type).css("display") == "none") {
		$(e).find(".on_off").html(Templates.toggleBlockOn);
	} else {
		$(e).find(".on_off").html(Templates.toggleBlockOff);
	}
	
	$("#usersBlock"+type).slideToggle(0, function () {Sys.initUserList();});
}

var Templates = {
	estimated : [ '', 'а', '' ],
	simpatico : [ '', 'а', 'ый' ],
	like : [ '', 'ась', 'ся' ],
	friendAddName : 'Добавить в друзья',
	friendDelName : 'Удалить из друзей',
	friendAdd : '<a href="#" onclick="Friend.add();">Добавить в друзья</a>',
	friendDel : '<a href="#" onclick="Friend.del();">Удалить из друзей</a>',
	msgDropped : 'Сообщение удалено',
	toggleBlockOn : '<img src="img/arrow_on_small.png" width=11 height=11>',
	toggleBlockOff : '<img src="img/arrow_off_small.png" width=11 height=11>',
	loader : '<img src="img/loader.gif">',
	noMessages : '<div style="padding: 10px;">No msg opend</div>',
	friendsOnline : 'Друзья онлайн',
	friendsOffline : 'Друзья оффлайн',
	onlineUsersList : 'Познакомься с ними!',
	selectDialog : 
		'<div class="user %is_avtive%" id="dialog_%uid%" onmousedown="Dialog.select(%uid%);">'+
		'	%text%'+
		'</div>',
	tempDialogMove : 
		'<div id="temp_dialog_%uid%" class="temp_dialog">'+
		'	%text%'+
		'</div>',
	appreciated : 
		'<div class="mark fl">%text%</div><div class="mark_text fl">'+
		'	Я оценил%sex% тебя!'+
		'</div>',
	rated : 
		'<div class="mark fl">'+
		'	%text%'+
		'</div>'+
		'<div class="mark_text fl">'+
		'	Вас оценили. <a href="#" onclick="Votes.show();return false;">Оценить в ответ</a>'+
		'</div>',
	prettier : 
		'<div class="mark heart fl"> </div>'+
		'<div class="mark_text fl">'+
		'	Ты мне симпатичн%sex%'+
		'</div>',
	liked : 
		'<div class="mark heart fl"> </div>'+
		'<div class="mark_text fl">'+
		'	Ты понравил%sex%. <a href="#" onclick="SendMark(10, 4);return false;">Отправить взаимную симпатию</a>'+
		'</div>',
	mutualSympathy : 
		'<div class="mark hearts fl"> </div>'+
		'<div class="mark_text fl">'+
		'	У нас взаимная симпатия!'+
		'</div>',
	mutualSympathyGift : 
		'<div class="mark hearts fl"> </div>'+
		'<div class="mark_text hearts fl">'+
		'	У вас взаимная симпатия!<br>'+
		'	<a href="#" onclick="SendMark(10, 1);return false;">Подарок</a> - лучший способ продолжить отношения.'+
		'</div>',
	friendBlock : 
		'<div class="user active" id="dialog_%uid%" onmousedown="Dialog.select(%uid%);">'+
		'	%html%'+
		'</div>',
	usersListBlock : 
		'<div class="user expander" onMouseDown="ToggleUsersBlock(this, %type%);">'+
		'	<div class="fl on_off">'+
		'		<img src="img/arrow_on_small.png" width=11 height=11>'+
		'	</div>'+
		'	<div class="fl">'+
		'		%name% '+
		'	</div>'+
		'	<div class="cb"></div>'+
		'</div>',
	usersListUser : 
		'<div class="user" id="dialog_%uid%" onMouseDown="Dialog.select(%uid%);">'+
		'	<div class="fl on_off">'+
		'		<img src="img/%online_status%.png">'+
		'	</div>'+
		'	<div class="fl">'+
		'		<span id="user_login_%uid%">%first_name%</span>, %age% '+
		'	</div>'+
		'	<div class="fr">'+
		'		<img src="%photo%" class="user_avatar">'+
		'	</div>'+
		'	<div class="fr new_msg_cnt %unread_visibility%">'+
		'		%new% '+
		'	</div>'+
		'	<div class="fr">'+
		'		<img src="img/del.png" class="drop_dialog" onMouseDown="event.cancelBubble = true; Dialog.remove(%uid%); return false;">'+
		'	</div>'+
		'	<div class="fr ndsp" id="dialog_%uid%_preloader">'+
		'		<img src="http://st0.userapi.com/images/upload.gif" style="margin-top: 10px;" height="11" width="16">'+
		'	</div>'+
		'	<div class="cb"></div>'+
		'</div>',
	userInfo : 
		'<div class="dialog_user">'+
		'	<div class="fl user_avatar">'+
		'		<img src="%photo%">'+
		'	</div>'+
		'	<div class="fl user_info">'+
		'		<a href="#">%first_name%, %age%</a><br>'+
		'		%country%, %city%'+
		'	</div>'+
		'	<div class="fr user_action">'+
		'		<span id="user_action_%uid%"><a href="#" onclick="%friend_action%">%friend_action_text%</a></span><br>'+
		'		<a href="#">Пожаловаться</a><br>'+
		'	</div>'+
		'	<div class="cb"></div>'+
		'</div>',
	dialogInit : 
		'<div id="temp_dialog_%uid%" class="temp_dialog">'+
		'	%userInfo%'+
		'	<div class="dialog_messages %is_new%" style="min-height: %height%px;">'+
		'		%messages%'+
		'	</div>'+
		'	<div class="dialog_write %is_new%">'+
		'		<div id="message_status_%uid%">'+
		'			<div class="msg_status"><img src="img/info.png"> Хотите узнать о прочтении вашего сообщения? <a href="#">Узнать</a><br></div>'+
		'			<div class="msg_repost"><img src="img/error.png"> Ваше сообщение не доставлено. <a href="#" onclick="Dialog.repost();return false">Повторить попытку</a><br></div>'+
		'		</div>'+
		'		<form onsubmit="Dialog.post();return false;">'+
		'			<textarea id="dialog_text_%uid%"></textarea><br>'+
		'			<div class="fl button_blue">'+
		'				<button onclick="Dialog.post();return false;">Отправить</button>'+
		'			</div>'+
		'			<div class="fl send_gift">'+
		'				<img src="img/gift.png">'+
		'				<a href=#>Отправить подарок</a>'+
		'			</div>'+
		'			<div class="fl send_star">'+
		'				<img src="img/star.png">'+
		'				<a href=# onclick="Votes.show();return false;">Отправить оценку</a>'+
		'			</div>'+
		'		</form>'+
		'	</div>'+
		'</div>'+
		'<div class="cb></div>',
	message : 
		'<div id="msg_%mid%" class="message">'+
		'	<div class="user_name fl %is_out%" style="width: %width%px;">'+
		'		<a href=#>'+
		'			%sender% '+
		'		</a>'+
		'	</div>'+
		'	<div class="msg fl" style="width: %mWidth%px;">'+
		'		%text% '+
		'	</div>'+
		'	<div class="fl">'+
		'		<img src="img/del.png" class="drop_dialog" onMouseDown="event.cancelBubble = true; Modal.show(2, this); return false; Message.remove(this); return false;">'+
		'	</div>'+
		'	<div class="fl time">'+
		'		%loading% '+
		'	</div>'+
		'	<div class="fl drop">'+
		'		<img src="img/drop.png">'+
		'	</div>'+
		'	<div class="cb"></div>'+
		'	</div>',
	modal : 
		'<div id="modal" style="height: %modal_height%px;">'+
		'	<div class="box %modal_class%">'+
		'		<div class="main">'+
		'			<div class="close" onclick="Modal.close();"></div>'+
		'				%modal_text%'+
		'		</div>'+
		'	</div>'+
		'</div>',
	modal_votes :
		'Отправьте %user% оценку<br>'+
		'<div class="stars">'+
		'	<div class="fl star" id="mark_1" onclick="SendMark(this);">1</div>'+
		'	<div class="fl star" id="mark_2" onclick="SendMark(this);">2</div>'+
		'	<div class="fl star" id="mark_3" onclick="SendMark(this);">3</div>'+
		'	<div class="fl star" id="mark_4" onclick="SendMark(this);">4</div>'+
		'	<div class="fl star" id="mark_5" onclick="SendMark(this);">5</div>'+
		'	<div class="fl star" id="mark_6" onclick="SendMark(this);">6</div>'+
		'	<div class="fl star" id="mark_7" onclick="SendMark(this);">7</div>'+
		'	<div class="fl star" id="mark_8" onclick="SendMark(this);">8</div>'+
		'	<div class="fl star" id="mark_9" onclick="SendMark(this);">9</div>'+
		'	<div class="fl star" id="mark_10" onclick="SendMark(this);">10</div>'+
		'	<div class="cb"></div>'+
		'</div>',
	modal_delete : 
		'<div class="del">Вы действительно хотите удалить сообщение?<br></div>'+
		'<div class="msg">'+
		'	«%text%»'+
		'</div>'+
		'<div class="bottom">'+
		'	<div class="fl button_blue">'+
		'		<button onclick="Message.remove(%mid%);return false;">Удалить</button>'+
		'	</div>'+
		'	<div class="fl del_txt"><a href="#" onclick="Modal.close();return false;">Нет, не надо удалять</a></div>'+
		'	<div class="cb"></div>'+
		'</div>',
	clean : {
		dialog : function () {
			$("#chat").html("");
		},
		usersList : function () {
			$("#user_list").html("");
		}
	},
	format : function (templateName, data) {
		var html = Templates[templateName];
		$.each(data, function (k,v) {
			html = html.split("%" + k + "%").join(v);
		});
		return html;
	}
};

var TR = Templates.format;

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

var scrolling_status = false;
var scrolling_position = -1;

function ScrollList (side, need_stop) {
	
	if (need_stop) {
		$("#user_list_fix").stop();
		scrolling_status = false;
		return false;
	}
	
	if (scrolling_status == true) return false;
	
	scrolling_status = true;
	
	var uid = Dialog.storage.uid;
	var global_offset = ($("#temp_dialog_"+uid+" .dialog_user").offset() || 0);
	var curpos_offset = Math.abs($("#user_list").offset().top-(global_offset.top || 0));
	if (side == "top") {
		curpos_offset -= 100;
	} else {
		curpos_offset += 100;
	}
	
	if (scrolling_position == curpos_offset) {
		scrolling_status = false;
		return false;
	} else {
		scrolling_position = curpos_offset;
	}
	
	$("#user_list_fix").animate({scrollTop:curpos_offset}, 500, "linear", function () {
		scrolling_status = false;
		ScrollList (side, (need_stop || 0));
	});
	
}

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

function formatMessage (text) {
	text = text.replace( /^\s+/g, '').replace( /\s+$/g, '').replace( /\s{1,}/g,' ')
	return text;
}