var request = require('request');

exports.getToken= (req,res)=>{
	
var headers = {
    'User-Agent':       'Super Agent/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
}
url=req.body.url+'/login/token.php?';

var options = {
    url: url,
    method: 'GET',
    headers: headers,
    qs: {'username': req.body.username,
		 'password': req.body.password,
         'service':  req.body.service }
}

request(options, (error, response, body) => {
    if (!error && response.statusCode == 200) {
        // Print out the response body
        try {
        var response = JSON.parse(body);
        } catch (e) {
        // An error has occured, handle it, by e.g. logging it
        var msgAlert="Error al conectar. Compruebe URL.";
        res.render ('index',{msgAlert:msgAlert});
        console.log("Bad Url");
        }
        var myToken = response.token;
        console.log(body);
        console.log(myToken);
        if(myToken==undefined){
            var msgAlert="Error. Compruebe Usuario y Contraseña";
            res.render ('index',{msgAlert:msgAlert});    
        }else{
            url=req.body.url+'/webservice/rest/server.php?wsfunction=core_course_get_courses&moodlewsrestformat=json&';
            console.log(url);
            var headers = {
                'User-Agent':       'Super Agent/0.0.1',
                'Content-Type':     'application/x-www-form-urlencoded'
            }
            var options = {
                url: url,
                method: 'GET',
                headers: headers,
                qs: {'wstoken': myToken}
            }
            request(options, (error, response, body)=>{
                if (!error && response.statusCode == 200) {
                    try {
                    var courses=JSON.parse(body);
                    var arrayCourses=[];
                    console.log(courses);
                    } catch (e) {
                        // An error has occured, handle it, by e.g. logging it
                        res.send ("Error al conectar");
                        console.log("Bad Url");
                    }
                    
                    for(let course of courses) {

                        console.log(`${course.id} - ${course.shortname}_${course.fullname}`);
                        arrayCourses.push({
                            id: course.id,
                            fullname: course.fullname,
                        });
                        
                    }
                    res.render('courses',{token:myToken,url:req.body.url,array:arrayCourses});     
                }
                else{
                    var msgAlert="Error al conectar con Moodle. Compruebe la dirección web";
                    res.render('index',{msgAlert:msgAlert});
                }
            });
        }

    }else{
        var msgAlert="Error al conectar con Moodle. Compruebe la dirección web";
        res.render('index',{msgAlert:msgAlert});
    }
});
};