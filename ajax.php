<?
header('Content-type: text/html; charset=utf-8');

include('conf.php');

if ($_POST['hash'] != gen_auth_hash(USER_ID."|".(USER_ID%10))) die("#ERROR CODE ".__LINE__);

update_online();

if (isset($_POST['act'])) {
	if ($_POST['act'] == "get_dialogs") {
		/*
			Получение данных по диалогам (друзья + онлайн)
			Получение данных о друзьях
			Получение данных о людях в онлайне
		*/
		
		/*
			$friendsList - список друзей
			$onlineList - список любдей онлайн (не друзей)
			$dialogList - список диалогов пользователя => uid -> did
		
		*/
		
		$dialogUsers = $dialogList = $friendsList = $onlineList = $friendsByID = array();
		
		$usersList = array();
		
		$dialogsUsers = $receiversAndFriends = $dialogsData = $receivers = $rids = array();
			
		$DIALOGS_OFFSET = get_offset(USER_ID, DIALOGS_OFFSET_LEVEL);
		
		$getList = mysql_query("SELECT * FROM `_users_to_dialogs_".$DIALOGS_OFFSET."` WHERE `uid` = ".USER_ID." AND `is_active` = 1 ");
		if (mysql_num_rows($getList) > 0) {
			while ($d = mysql_fetch_assoc($getList)) {
				$uid = $d['rid'];
				$dialogList[$uid] = $d;
				$dialogUsers[] = $uid;
			}
		}
		//$notIN = (!empty($dialogsUsers)) ? $notIN = " AND `fid` NOT IN (".implode(",", $dialogsUsers).") " : "";
		
		$FRIENDS_OFFSET = get_offset(USER_ID, FRIENDS_OFFSET_LEVEL);
		$getFriendsList = mysql_query("SELECT * FROM `_users_to_friends_".$FRIENDS_OFFSET."` WHERE `uid` = ".USER_ID." ");
		if (mysql_num_rows($getFriendsList) > 0) {
			while ($d = mysql_fetch_assoc($getFriendsList)) {
				$uid = $d['fid'];
				$friendsList[] = (int)$uid;
				$friendsByID[$uid] = 1;
				$getUserInfo = $m->get("user:info:".$uid);
				if (!empty($getUserInfo)) {
					$getUserInfo['is_friend'] = 1;
					$getUserInfo['dialog'] = ($dialogList[$uid]) ? $dialogList[$uid] : array();
					$usersData[$uid] = $getUserInfo;
				} else {
					$usersList[] = $uid;
				}
			}
		}
		
		$ninFriendsList = $friendsList;
		$ninFriendsList[] = USER_ID;
		
		$getOnlineList = $db->users_online->find(array("uid" => array('$nin'=>$ninFriendsList)))->sort(array("time" => -1));
		
		foreach ($getOnlineList as $k=>$v) {
			$uid = $v['uid'];
			$getUserInfo = $m->get("user:info:".$uid);
			if (!empty($getUserInfo)) {
				$getUserInfo['is_friend'] = 0;
				$getUserInfo['dialog'] = ($dialogList[$uid]) ? $dialogList[$uid] : array();
				$getUserInfo['last_activity'] = $v['time'];
				$usersData[$uid] = $getUserInfo;
			} else {
				$usersList[] = $uid;
			}
		}
		foreach ($dialogUsers as $k=>$v) {
			$uid = $v['uid'];
			$getUserInfo = $m->get("user:info:".$uid);
			if (empty($getUserInfo)) {
				if (!in_array($uid, $usersList)) {
					$usersList[] = $uid;
				}
			}
		}
		
		if (!empty($usersList)) {
			$q = mysql_query("SELECT * FROM `_users` WHERE `uid` IN (".implode(",", $usersList).") LIMIT ".count($usersList)." ");
			if (mysql_num_rows($q) > 0) {
				while ($d = mysql_fetch_assoc($q)) {
					$uid = $d['uid'];
					$d['is_friend'] = (isset($friendsByID[$uid])) ? 1 : 0;
					$d['dialog'] = ($dialogList[$uid]) ? $dialogList[$uid] : array();
					$usersData[$uid] = $d;
				}
			}
		}
		
		$users = array('on' => array(), 'off' => array(), 'all' => array());
		foreach ($usersData as $k=>$v) {
			
			if (isset($v['pass'])) unset($v['pass']);
			
			$v['online'] = ($v['last_activity'] > (time()-300)) ? 1 : 0;
			
			$mv = $v;
			$mv['dialog'] = array();
			
			$m->set("user:info:".$v['uid'], $mv);
			
			if ($v['is_friend']) {
				if ($v['online'] == 1) {
					$users['on'][] = $v;
				} else {
					$users['off'][] = $v;
				}
			} else {
				$users['all'][] = $v;
			}
		}
		
		$data['resp'] = $users;
		
	} else if ($_POST['act'] == "get_dialog_msg") {
		if (!isset($_POST['rid'])) {
			die;
		}
		$rid = (int)$_POST['rid'];
		
		$data['resp'] = array(
			'did' => 0,
			'uid' => $rid,
			'unread' => 0,
			'messages' => array()
		);
		
		$did = $m->get("dialog:".$rid.":".USER_ID);
		
		if (empty($did)) {
			$DIALOGS_OFFSET = get_offset(USER_ID, DIALOGS_OFFSET_LEVEL);
			$getDialogID = mysql_fetch_row(mysql_query("SELECT `did` FROM `_users_to_dialogs_".$DIALOGS_OFFSET."` WHERE `uid` = ".USER_ID." AND `rid` = ".$rid." "));
			if ($getDialogID && isset($getDialogID[0]) && $getDialogID[0] > 0) {
				$did = $getDialogID[0];
				$m->set("dialog:".$rid.":".USER_ID, $did);
				$m->set("dialog:".USER_ID.":".$rid, $did);
			}
		}
		
		if ($did) {
			$MESSAGES_OFFSET = get_offset(USER_ID, MESSAGES_OFFSET_LEVEL);
			$getMessages = mysql_query("SELECT * FROM `_messages_".$MESSAGES_OFFSET."` WHERE `did` = ".$did." AND `uid` = ".USER_ID." AND `type` > 0 ORDER BY `date` DESC LIMIT ".MSG_LIMIT." ");
			if (mysql_num_rows($getMessages)) {
				$msg = array();
				$unread = array();
				while ($messages = mysql_fetch_assoc($getMessages)) {
					$msg[] = $messages;
					if ($messages['read_state'] == 1) {
						$unread[] = $messages['mid'];
					}
				}
				
				if (!empty($unread)) {
					$DIALOGS_OFFSET = get_offset(USER_ID, DIALOGS_OFFSET_LEVEL);
					mysql_query("UPDATE `_messages_".$MESSAGES_OFFSET."` SET `read_state` = 1 WHERE `mid` IN (".implode(',', $unread).") LIMIT ".count($unread)." ");
					mysql_query("UPDATE `_users_to_dialogs_".$DIALOGS_OFFSET."` SET `new` = 0 WHERE `uid` = ".USER_ID." AND `did` = ".$did." LIMIT 1 ");
				}
				
				$data['resp']['did'] = $did;
				$data['resp']['unread'] = $unread;
				$data['resp']['messages'] = $msg;
			}
		}
		
	} else if ($_POST['act'] == "drop_message") {
		if (!isset($_POST['rid']) || !isset($_POST['mid'])) {
			die;
		}
		$mid = (int)$_POST['mid'];
		$rid = (int)$_POST['rid'];
		
		$did = $m->get("dialog:".$rid.":".USER_ID);
		if (!empty($did)) {
			$MESSAGES_OFFSET = get_offset(USER_ID, MESSAGES_OFFSET_LEVEL);
			mysql_query("UPDATE `_messages_".$MESSAGES_OFFSET."` SET type = 0 WHERE `mid` = ".$mid." AND `did` = ".$did." AND `uid` = ".USER_ID." LIMIT 1 ");
		}
	} else if ($_POST['act'] == "drop_dialog") {
		if (!isset($_POST['rid']) || !isset($_POST['mid'])) {
			die;
		}
		$mid = (int)$_POST['mid'];
		$rid = (int)$_POST['rid'];
		
		$did = $m->get("dialog:".$rid.":".USER_ID);
		if (!empty($did)) {
			$MESSAGES_OFFSET = get_offset(USER_ID, MESSAGES_OFFSET_LEVEL);
			mysql_query("UPDATE `_messages_".$MESSAGES_OFFSET."` SET type = 0 WHERE `mid` = ".$mid." AND `did` = ".$did." AND `uid` = ".USER_ID." LIMIT 1 ");
		}
		
	} else if ($_POST['act'] == "set_as_read") {
		if (!isset($_POST['rid'])) {
			die;
		}
		$rid = (int)$_POST['rid'];
		$did = $m->get("dialog:".$rid.":".USER_ID);
		if (!empty($did)) {
			$MESSAGES_OFFSET = get_offset(USER_ID, MESSAGES_OFFSET_LEVEL);
			if (isset($_POST['mid'])) {
				$mid = (int)$_POST['mid'];
				mysql_query("UPDATE `_messages_".$MESSAGES_OFFSET."` SET `read_state` = 0 WHERE `mid` = ".$mid." AND `did` = ".$did." AND `uid` = ".USER_ID." LIMIT 1 ");
			} else {
				mysql_query("UPDATE `_messages_".$MESSAGES_OFFSET."` SET `read_state` = 0 WHERE `did` = ".$did." AND `uid` = ".USER_ID." ");
			}
			
			$DIALOGS_OFFSET = get_offset(USER_ID, DIALOGS_OFFSET_LEVEL);
			mysql_query("UPDATE `_users_to_dialogs_".$DIALOGS_OFFSET."` SET `new` = 0 WHERE `uid` = ".USER_ID." AND `did` = ".$did." LIMIT 1 ");
		}
	} else if ($_POST['act'] == "send_msg") {
		
		$rand = rand(1,10);
		if ($rand == 5) {
			header("Status: 404 Not Found");
			die;
		}
		
		if (!isset($_POST['rid']) || !isset($_POST['text']) || !isset($_POST['mid']) || strlen($_POST['text']) < 1) {
			die;
		}
		
		if (!isset($_POST['type'])) {
			$type = 1;
		} else {
			
			$type = (int)$_POST['type'];
			$text = (int)$_POST['text'];
			if ($type < 1 || $type > 4) die;
			
			$user = $m->get("user:main:".USER_ID);
			if (empty($user)) {
				$user = mysql_fetch_assoc(mysql_query("SELECT * FROM `_users` WHERE `uid` = ".USER_ID." LIMIT 1 "));
				$m->set("user:main:".USER_ID, $user);
			}
			if ($type > 1) {
				/*
					2 - оценка
					3 - симпатия
					4 - взаимная симпатия
				*/
				$mark = $text;
				if ($type == 2 && $text >= $user['average_mark']) {
					$type = 3;
				} else {
					if ($type > 2) {
						$mark = 10;
					}
				}
				
				$user['average_mark'] = (($user['marks_count'] * $user['average_mark']) + $text) / (++$user['marks_count']);
				mysql_query("UPDATE `_users` SET `average_mark` = ".$user['average_mark'].", `marks_count` = ".$user['marks_count']." WHERE `uid` = ".USER_ID." LIMIT 1 ");
				$m->set("user:main:".USER_ID, $user);
				$text = $mark;
			}
		}
		
		$rid = (int)$_POST['rid'];
		
		$getDialog = $m->get("dialog:".$rid.":".USER_ID);
		
		$DIALOGS_OFFSET = get_offset(USER_ID, DIALOGS_OFFSET_LEVEL);
		
		if (empty($getDialog)) {
			$getDialogID = mysql_fetch_row(mysql_query("SELECT `did` FROM `_users_to_dialogs_".$DIALOGS_OFFSET."` WHERE `uid` = ".USER_ID." AND `rid` = ".$rid." LIMIT 1 "));
			if ($getDialogID && isset($getDialogID[0]) && $getDialogID[0] > 0) {
				$did = $getDialogID[0];
			} else {
				
				mysql_query("INSERT INTO `_dialogs` VALUES (NULL, 1) ");
				$did = mysql_insert_id();
				mysql_query("INSERT INTO `_users_to_dialogs_".$DIALOGS_OFFSET."` (`id`, `uid`, `rid`, `did`, `new` ) VALUES ( NULL , '".USER_ID."', '".$rid."', '".$did."', '0' ) ");
				$DIALOGS_OFFSET = get_offset($rid, DIALOGS_OFFSET_LEVEL);
				mysql_query("INSERT INTO `_users_to_dialogs_".$DIALOGS_OFFSET."` (`id`, `uid`, `rid`, `did`, `new` ) VALUES ( NULL , '".$rid."', '".USER_ID."', '".$did."', '0' ) ");
				
			}
			$m->set("dialog:".$rid.":".USER_ID, $did);
			$m->set("dialog:".USER_ID.":".$rid, $did);
		} else {
			$did = $getDialog;
		}
		
		$did = (int)$did;
		$text = mysql_real_escape_string(strip_tags($_POST['text']));
		$t = time();
		
		mysql_query("INSERT INTO `_messages_to_dialogs` VALUES (NULL, ".$did." ) ");
		$mid = mysql_insert_id();
		
		if ($mid) {
			$MESSAGES_OFFSET = get_offset(USER_ID, MESSAGES_OFFSET_LEVEL);
			mysql_query("
				INSERT INTO 
					`_messages_".$MESSAGES_OFFSET."`
				SET 
					`mid` = ".$mid.",
					`did` = ".$did.",
					`uid` = ".USER_ID.",
					`out` = 1,
					`read_state` = 1,
					`type` = ".$type.",
					`date` = ".$t.",
					`text` = '".$text."'
			");
			$MESSAGES_OFFSET = get_offset($rid, MESSAGES_OFFSET_LEVEL);
			mysql_query("
				INSERT INTO 
					`_messages_".$MESSAGES_OFFSET."`
				SET 
					`mid` = ".$mid.",
					`did` = ".$did.",
					`uid` = ".$rid.",
					`out` = 0,
					`read_state` = 0,
					`type` = ".$type.",
					`date` = ".$t.",
					`text` = '".$text."'
			");
			
			$DIALOGS_OFFSET = get_offset($rid, DIALOGS_OFFSET_LEVEL);
			mysql_query("UPDATE `_users_to_dialogs_".$DIALOGS_OFFSET."` SET `new` = `new` + 1 WHERE `uid` = ".$rid." AND `did` = ".$did." LIMIT 1 ");
			
			if (!mysql_error()) {
				$data['resp'] = array(
					'mid' => $mid,
					'did' => $did,
					'rid' => $rid,
					'old' => (int)$_POST['mid'],
					'type' => $type,
					'out' => 1,
					'date' => $t,
					'text' => $text,
				);
				
				$pushData = array(
					'mid' => $mid,
					'did' => $did,
					'uid' => USER_ID,
					'type' => $type,
					'out' => 0,
					'date' => $t,
					'text' => $text,
					'read_state' => 0
				);
				push(201, gen_channel_hash($rid), $pushData);
			}
		}
		
	} else if ($_POST['act'] == "send_mark") {
		
		if (!isset($_POST['rid']) || !isset($_POST['mark'])) die;
		
		$mark = (int)$_POST['mark'];
		$rid = (int)$_POST['rid'];
		
		$data['resp'] = array(
			'mid' => $mid,
			'did' => $did,
			'uid' => USER_ID,
			'type' => 2,
			'out' => 0,
			'date' => $t,
			'text' => $mark,
			'read_state' => 0
		);
		
	} else if ($_POST['act'] == "friend_add") {
		if (!isset($_POST['fid'])) die;
		$fid = (int)$_POST['fid'];
		$FRIENDS_OFFSET = get_offset(USER_ID, FRIENDS_OFFSET_LEVEL);
		mysql_query("INSERT INTO `_users_to_friends_".$FRIENDS_OFFSET."` VALUES ( NULL, ".USER_ID.", ".$fid." ) ");
	}  else if ($_POST['act'] == "friend_del") {
		if (!isset($_POST['fid'])) die;
		$fid = (int)$_POST['fid'];
		$FRIENDS_OFFSET = get_offset(USER_ID, FRIENDS_OFFSET_LEVEL);
		mysql_query("DELETE FROM `_users_to_friends_".$FRIENDS_OFFSET."` WHERE `uid` = ".USER_ID." AND `fid` = ".$fid." LIMIT 1 ");
	}
}
else {

}

echo json_encode($data);