<?
header('Content-type: text/html; charset=utf-8');
include('conf.php');

check_auth($userInfo['pass']);

$userInfo = $m->get("user:main:".USER_ID);
if (empty($userInfo)) {
	$getThisUserInfo = mysql_query("SELECT * FROM `_users` WHERE `uid` = ".USER_ID." LIMIT 1 ");
	if (mysql_num_rows($getThisUserInfo) == 1) {
		$userInfo = mysql_fetch_assoc($getThisUserInfo);
		$m->set("user:main:".USER_ID, $userInfo);
	} else {
		die("#ERROR CODE ".__LINE__);
	}
}

mysql_query("UPDATE `_users` SET `last_activity` = ".time()." WHERE `uid` = ".USER_ID." ");
$pushData = $userInfo;
$pushData['last_activity'] = time();
$pushData['online'] = 1;
$pushData['dialog'] = array();
unset($pushData['pass']);
$m->set("user:info:".USER_ID, $pushData);
push (101, "topface_online", $pushData);

?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta http-equiv="X-UA-Compatible" content="IE=9" />
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
	<script src="http://code.jquery.com/jquery-latest.js"></script>
	<script src="http://agalkin.ru/js/Name.js"></script>
	<script src="js/jquery.ui.core.js"></script>
	<script src="js/jquery.ui.widget.js"></script>
	<script src="js/jquery.ui.mouse.js"></script>
	<script src="js/jquery.ui.sortable.js"></script>
	
	<script src="js/main.js"></script>
	<link rel="stylesheet" type="text/css" href="css/main2.css" />
	<script type="text/javascript">
		var HASH_TIME = "<?=date("r")?>";
		var User = {
			uid : <?=USER_ID?>,
			first_name : "<?=$userInfo['first_name']?>",
			sex : "<?=$userInfo['sex']?>",
			average_mark : "<?=$userInfo['average_mark']?>",
			marks_count : "<?=$userInfo['marks_count']?>",
			hash : "<?=gen_auth_hash(USER_ID."|".(USER_ID%10))?>"
		};
		$(document).ready(function() {
			Sys.resize();
			Dialog.get();
			$("body").prepend('<span id="self_login">'+User.first_name+'</span>');
			Listener.add('<?=gen_channel_hash()?>', RPL.init, return_false);
			Listener.add('topface_online', RPL.init, return_false);
			
			//Listener('http://sea.tlov.ru/events?cid=topface_online', RPL.init, return_false);
		});
	</script>
	<!--[if IE]> 
		<link rel="stylesheet" type="text/css" href="css/ie.css" />
	<![endif]-->
</head>
<body>
	<div id="fixer">
		<div id="main">
			<div class="fl" id="scroll_top" onmouseover="ScrollList('top');" onmouseout="ScrollList('top', 1);"></div>
			<div class="fl" id="scroll_bot" onmouseover="ScrollList('bot');" onmouseout="ScrollList('bot', 1);"></div>
			<div class="fl" id="user_list_fix">
				<div class="fl" id="user_list">
					No Users
				</div>
			</div>
			<div class="fr" id="chat">
				<div style="padding: 10px;">No msg opend</div>
			</div>
			
			<div class="cb"></div>
		</div>
		<div class="cb"></div>
	</div>
	<div class="tooltip" id="tooltip">
		<h1>Начни с интересной фразы</h1>
		Произведи хорошее впечатление<br>
		<div class="fl"><a href="#" onclick="Tooltip.paste();">«<span id="compliment"></span>»</a></div>
		<div class="fr" onclick="Tooltip.gen();">
			<div class="fl"><img src="img/reload.png"></div>
			<div class="fl"><a href="#" onclick="return false">Другой комплимент</a></div>
			<div class="cb"></div>
		</div>
		<div class="cb"></div>
		<div class="text">
			Напиши первое сообщение
		</div>
	</div>
</body>
</html>