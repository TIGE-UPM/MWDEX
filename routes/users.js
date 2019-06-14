var request = require('request');

exports.getUsers = (req, res) =>{
    
    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    var url = req.body.url + '/webservice/rest/server.php?wsfunction=core_enrol_get_enrolled_users&courseid=' + req.body.courseid + '&moodlewsrestformat=json';
    var token = req.body.token;
    var courseid = req.body.courseid;
    var workshopid = req.body.id;
    var options = {
        url: url,
        method: 'GET',
        headers: headers,
        qs: {
            'wstoken': req.body.token
        }
    }
    request(options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            // Print out the response body
            var arrayUsers = [];
            var response = JSON.parse(body);
            for (let resp of response) {
                //filtro por rol de alumno
                if(resp.roles[0].roleid == 5){
                	arrayUsers.push({
                    	id: resp.id,
                    	fullname: resp.fullname,
                	});
                }
            }
            if(arrayUsers.length==0){
            res.render('error'); 
            }
            res.render('users',{token:req.body.token, courseid:req.body.courseid, workshopid:req.body.id, url:req.body.url,array:arrayUsers});
        }
    });

}






