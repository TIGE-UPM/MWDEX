var request = require('request');

exports.getWorkshops = (req, res) =>{
    var headers = {
    'User-Agent':       'Super Agent/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
    }
    var url = req.body.url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_workshops_by_courses&courseids[0]=' + req.body.id + '&moodlewsrestformat=json';
    var idcurso = req.body.id;
    var token = req.body.token;
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
        try {
        var workshopsArr = JSON.parse(body);
        var arrayWorkshops = [];
        var workshops = workshopsArr.workshops;
        } catch (e) {
        // An error has occured, handle it, by e.g. logging it
        res.send ("Error al conectar");
        console.log("Bad Url");
        }        
            if(workshops.length == 0){
                res.render('error');     
            }else{

            for(let ws of workshops){
                console.log(`${ws.id} - ${ws.name}_${ws.course}`);
                arrayWorkshops.push({
                    workshopid: ws.id,
                    workshopname: ws.name,
                    courseid: ws.course,
                });
            }
        }           
        res.render('workshops',{token:req.body.token, courseid:req.body.id, url:req.body.url,array:arrayWorkshops});     

    }else{
        res.send("Error al conectar.");
    }
    });

}
