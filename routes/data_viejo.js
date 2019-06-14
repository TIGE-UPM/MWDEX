var request = require('request');
var Excel = require('exceljs/modern.nodejs');

//llamo a getUsers y también a las siguientes funciones
exports.getInfo = (req, res) =>{
    var array = [];
    var size = 0;
    getUsers(req, (arrayUsers) => {
        getGradesReport(req, (arrayData) =>{
            array = [arrayUsers, arrayData[0], arrayData[1], arrayData[2]];
            size = arrayUsers.length+3*arrayData[0].length;
            getMatchData (array, size, (arrayDataUser) => {
                getExcelFromArray (arrayDataUser, (path) => {
                    res.download(path, 'notas.xlsx');
                });     
            })
        });
    });
}



getUsers = (req, res) =>{

    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    var url = req.body.url + '/webservice/rest/server.php?wsfunction=core_enrol_get_enrolled_users&courseid=' + req.body.courseid + '&moodlewsrestformat=json';
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
            console.log(arrayUsers);
            res(arrayUsers);
        }
    });

}

getGradesReport = (req, res) =>{
    var arrayAssessments = [];
    var arrayData = [];
    var arrayFeedbackFinal = [];
    var arrayAsp = [];
    var headers = {
        'User-Agent':       'Super Agent/0.0.1',
        'Content-Type':     'application/x-www-form-urlencoded'
    }
    var url = req.body.url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_grades_report&workshopid=' + req.body.workshopid + '&moodlewsrestformat=json';
    var options = {
        url: url,
        method: 'GET',
        headers: headers,
        qs: {
            'wstoken': req.body.token
        }
    }
    request(options, (error, response, body)=>{
        if (!error && response.statusCode == 200) {
            // Print out the response body
            try {
                var respuesta = JSON.parse(body);
            } catch (e) {
                // An error has occured, handle it, by e.g. logging it
                res.send ("Error al conectar");
                console.log("Bad Url");
            }
            var arrayReport = respuesta.report.grades;
            for(let i = 0; i<arrayReport.length; i++){
                for(let j = 0; j< arrayReport[i].reviewedby.length; j++){
                    arrayData.push({
                        submissionid: arrayReport[i].submissionid,
                        userReviewed: arrayReport[i].userid,
                        totalGrade: arrayReport[i].submissiongrade,
                        userReviewer: arrayReport[i].reviewedby[j].userid,
                        assessmentid: arrayReport[i].reviewedby[j].assessmentid,
                        gradeTotalAspects: arrayReport[i].reviewedby[j].grade,
                    })
                arrayAssessments.push({
                assessmentid: arrayReport[i].reviewedby[j].assessmentid,
                })
                }
            }

            if(arrayAssessments.length == 0){
                  res(arrayData);
            }
            for (let i = 0; i < arrayAssessments.length; i++) {
                var optionsAssessment = {
                    url: req.body.url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_assessment&moodlewsrestformat=json',
                    method: 'GET',
                    headers: headers,
                    qs: {
                        'wstoken': req.body.token,
                        'assessmentid': arrayAssessments[i].assessmentid,
                    }
                }
                request(optionsAssessment, (error, response, body) =>{
                    if (!error && response.statusCode == 200) {
                        try {
                            var respuestaAssessment = JSON.parse(body);
                        } catch (e) {
                            //An error has occured, handle it, by e.g. logging it
                            res.send ("Error al conectar");
                            console.log("Bad Url");
                        }
                        arrayFeedbackFinal.push({
                            feedbackFinal: respuestaAssessment.assessment.feedbackauthor,
                            reviewer: respuestaAssessment.assessment.reviewerid,
                            assessmentid: arrayAssessments[i].assessmentid,
                        });
                        var optionsForm = {
                            url: req.body.url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_assessment_form_definition&moodlewsrestformat=json',
                            method: 'GET',
                            headers: headers,
                            qs: {
                                'wstoken': req.body.token,
                                'assessmentid': arrayAssessments[i].assessmentid,
                                }
                            }
                            request(optionsForm, (error, response, body) =>{
                                         if (!error && response.statusCode == 200) {
                                            try {
                                                 var respuestaForm = JSON.parse(body);
                                            } catch (e) {
                                                 // An error has occured, handle it, by e.g. logging it
                                                 res.send ("Error al conectar");
                                                 console.log("Bad Url");
                                            }
                                            if(respuestaForm.current.length > 0){
                                                arrayAsp.push({
                                                    grade1: (respuestaForm.current[1].value-1)/(10),
                                                    grade2: (respuestaForm.current[4].value-1)/(10),
                                                    grade3: (respuestaForm.current[7].value-1)/(10),
                                                    feedback1: respuestaForm.current[2].value,
                                                    feedback2: respuestaForm.current[5].value,
                                                    feedback3: respuestaForm.current[8].value,
                                                    assessmentid: arrayAssessments[i].assessmentid,
                                                })
                                            }
                                            else{
                                                arrayAsp.push({
                                                    grade1: null,
                                                    grade2: null,
                                                    grade3: null,
                                                    feedback1: '',
                                                    feedback2: '',
                                                    feedback3: '',
                                                    assessmentid: arrayAssessments[i].assessmentid,
                                                })
                                            }
                                            res([arrayData, arrayFeedbackFinal, arrayAsp]);
                                        }
                                    
                            });
                    }
                });
            }
        }else{
            res.send("Error al conectar.");
        }
    });
}


getMatchData = (array, size, res) => {
    var arrayUsers = array[0];
    var arrayData = array[1];
    var arrayFeedback = array[2];
    var arrayAspects = array[3];
    var flag = 0;
    var arrayDataUser = [];
    var sizeAux= arrayUsers.length+arrayData.length+arrayFeedback.length+arrayAspects.length;
    console.log("ESTOY AQUI")
    console.log(size);
    console.log(sizeAux);
   if(sizeAux==size){
    console.log("Cumple condicion")
        for(let i=0; i<arrayData.length; i++){
             for(let l=0; l<arrayUsers.length; l++ ){
                if(arrayData[i].userReviewed==arrayUsers[l].id){
                     arrayDataUser.push({
                        nameUserReviewed: arrayUsers[l].fullname,
                     })
                }
                if(arrayData[i].userReviewer==arrayUsers[l].id){
                    arrayDataUser.push({
                        nameUserReviewer: arrayUsers[l].fullname,
                    })
                }
             }
             arrayDataUser.push({
                totalGrade: arrayData[i].totalGrade,
                totalGradeAspects: arrayData[i].gradeTotalAspects,
             })
            for(let j=0; j<arrayFeedback.length; j++ ){
                if(arrayData[i].assessmentid == arrayFeedback[j].assessmentid){
                    arrayDataUser.push({
                        feedbackFinal: arrayFeedback[j].feedbackFinal,
                    })
                }
            }

            for(let k=0; k<arrayAspects.length; k++){
              if(arrayData[i].assessmentid == arrayAspects[k].assessmentid){

                    arrayDataUser.push({
                        grade1: arrayAspects[k].grade1,
                        feedback1: arrayAspects[k].feedback1,
                        grade2: arrayAspects[k].grade2,
                        feedback2: arrayAspects[k].feedback2,
                        grade3: arrayAspects[k].grade3,
                        feedback3: arrayAspects[k].feedback3,
                    })
                }
            }
             if(arrayData[i].userReviewed == arrayData[i].userReviewer){
                 flag = 1;
             }
             arrayDataUser.push({
                 flag: flag,
             })
             flag=0;
        }
        
        res(arrayDataUser);
    }
     
}

getExcelFromArray = (array, res) => {

var arrayExcel= [];

for(let i=0; i<array.length; i+=6){
    arrayExcel.push({
        nameUserReviewed: array[0+i].nameUserReviewed,
        nameUserReviewer: array[1+i].nameUserReviewer,
        totalGrade: array[2+i].totalGrade,
        totalGradeAspects: array[2+i].totalGradeAspects,
        feedbackFinal: array[3+i].feedbackFinal,
        grade1: array[4+i].grade1,
        feedback1: array[4+i].feedback1,
        grade2: array[4+i].grade2,
        feedback2: array[4+i].feedback2,
        grade3: array[4+i].grade3,
        feedback3: array[4+i].feedback3,
        flag: array[5+i].flag,
    })
}

var worksheet = workbook.addWorksheet('Notas');
worksheet.columns = [
  { header: 'Reviewed', width: 50 },
  { header: 'Reviewer', width: 50 },
  { header: 'Final Grade',width: 10},
  { header: 'Final Grade Aspects',width: 10},
  { header: 'Feedback Final',width: 50},
  { header: 'Grade Aspect 1',width: 10},
  { header: 'Feedback Aspect 1',width: 50},
  { header: 'Grade Aspect 2',width: 10},
  { header: 'Feedback Aspect 2',width: 50},
  { header: 'Grade Aspect 3',width: 10},
  { header: 'Feedback Aspect 3',width: 50},
  { header: 'Flag',width: 10},
];

    for (let elem of arrayExcel) {
        worksheet.addRow([elem.nameUserReviewed, elem.nameUserReviewer, elem.totalGrade, elem.totalGradeAspects, elem.feedbackFinal, elem.grade1, elem.feedback1, elem.grade2, elem.feedback2, elem.grade3, elem.feedback3, elem.flag]);
    }
    try{
        workbook.xlsx.writeFile('grades.xlsx');
        res ('grades.xlsx');
    }catch(error){
        throw error;
    }


}