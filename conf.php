<?

define('C_SQL_NAME', 'test');
define('C_SQL_LOGIN', 'seabattle_new');
define('C_SQL_PASS', 'XL43ce6295rsggi');

date_default_timezone_set('Europe/Moscow');
$mysql = mysql_connect("localhost", C_SQL_LOGIN, C_SQL_PASS);
if (!$mysql) die('error');
mysql_select_db (C_SQL_NAME, $mysql);
mysql_query("SET NAMES UTF8");

$m = new Memcache();
$m->addServer('localhost', '11211');

$mongo = new Mongo("mongodb://admin:XL43ce6295rsggi@213.239.198.110:27017");
$db = $mongo->topface;

function get_offset($id = USER_ID, $offset_level = USERS_OFFSET_LEVEL)
{
	if ($offset_level == 0) {
		return "x_x";
	} else {
		$id = 1000000000+$id;
		$x = $id % 100;
		if ($offset_level == 1) {
			return "x_".$x;
		} else {
			$y = ((($id % 10000) - $x) / 100);
			return $y."_".$x;
		}
	}
}

function push ($type, $cids, $text) {
    /*
     * $type - тип сообщения (10Х - онлайн, 20Х - диалоги, 30Х - друзья)
     * $cids - ID канала, либо массив, у которого каждый элемент - ID канала
     * $text - сообщение, которое необходимо отправить 
     */
    $c = curl_init();
    $url = 'http://sea.tlov.ru/push?cid=';
    
    $message = array(
    	'type' => $type,
    	'time' => time(),
    	'msg' => $text
    );
    
    curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($c, CURLOPT_POST, true);

    if (is_array($cids)) {
        foreach ($cids as $v) {
            curl_setopt($c, CURLOPT_URL, $url.$v);
            curl_setopt($c, CURLOPT_POSTFIELDS, json_encode($message));
            $r = curl_exec($c);
        }
    } else {
        curl_setopt($c, CURLOPT_URL, $url.$cids);
        curl_setopt($c, CURLOPT_POSTFIELDS, json_encode($message));
        $r = curl_exec($c);
        //print_r($message);
    }
    curl_close($c);
    
}

function check_auth($pass) {
	
	/* TODO: TEMP LINE FOR NON PASS AUTH */
	
	if (!isset($_REQUEST['hash'])) {
		$_REQUEST['pass'] = "";
	}
	
	if (isset($_REQUEST['uid'])) {
		
		if (isset($_REQUEST['pass']) && gen_auth_hash($_REQUEST['pass']) == gen_auth_hash($pass)) {
			return true;
		}
		
		if (isset($_REQUEST['hash']) && $_REQUEST['hash'] == gen_auth_hash($pass)) {
			return true;
		}
		
	}
	die("#ERROR CODE ".__LINE__);
}

function gen_channel_hash ($uid = USER_ID) {
	$hash = "topface_".md5("a+6s5d6a+1c32z16546f9+f7+qf".$uid."krjhtkjwerhjkd");
	return $hash;
}

function gen_auth_hash ($pass) {
	$hash = md5(" | ASKLHD KJQHnbc,".md5($pass)."zxbcawhgTY!*&@$^*&");
	return $hash;
}

function update_online () {
	global $m, $db;
	$data = $m->get("user:info:".USER_ID);
	if (!empty($data)) {
		$la = $data['last_activity'];
		$data['last_activity'] = time();
		$data['online'] = 1;
		$m->set("user:info:".USER_ID, $data);
		
		if ($la < (time()-300)) {
			push (101, "topface_online", $data);
		}
	}
	$db->users_online->update( array("uid" => USER_ID), array('$set' => array("uid" => USER_ID, "time" => time())) , array('upsert' => true) );
}

if (!isset($_REQUEST['uid'])) {
	die("#ERROR CODE ".__LINE__);
}

$uid = (int)$_REQUEST['uid'];

DEFINE("USER_ID", $uid);
DEFINE("MSG_LIMIT", 20);

/* OFFSET LEVEL - уровень разбития таблицы, для понижения нагрузки. допустимые варианты 0/1/2 
 * 0 будет обращаться только к таблице с окончанием _x_x
 * 1 будет обращаться к таблицам с окончаниями _х_0 - _х_9
 * 2 будет обращаться к таблицам с окончаниями _0_0 - _9_9
 */

DEFINE("USERS_OFFSET_LEVEL", 0);
DEFINE("MESSAGES_OFFSET_LEVEL", 0);
DEFINE("DIALOGS_OFFSET_LEVEL", 0);
DEFINE("FRIENDS_OFFSET_LEVEL", 0);

$data = array();

