//var request = require('request');
var request = require('request-promise');
var Excel = require('exceljs/modern.nodejs');
var jsonfile = require('jsonfile')
var XLSX = require('xlsx');
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);
//var pt = require('pivottable');



//llamo a getUsers y también a las siguientes funciones
exports.getInfo = async (req, res) => {

    try {
        const arrayUsers = await getUsers(req.query.url, req.query.token, req.query.courseid);
        const arrayData = await getGradesReport(req.query.url, req.query.token, req.query.workshopid);
        let array = [arrayUsers, arrayData[0], arrayData[1], arrayData[2]];
        if(arrayData.length==0){
            res.render('error');
        }
        const arrayDataUser = await getMatchData(array);
        const arrayDataJson = await getMatchJson(array);
		let ts = Date.now();
		let date_ob = new Date(ts);
		let date = ("0" + date_ob.getDate()).slice(-2);
		let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
		let year = date_ob.getFullYear();
		let hours = ("0" + date_ob.getHours()).slice(-2);
		let minutes = ("0" + date_ob.getMinutes()).slice(-2);
		let seconds = ("0" + date_ob.getSeconds()).slice(-2);			
		let downloadfile = 'MWDEX_download_' + year + "_" + month + "_" + date + "_" + hours + "_" + minutes + "_" + seconds + '.xlsx';
		let downloadfilejson = 'MWDEX_download_' + year + "_" + month + "_" + date + "_" + hours + "_" + minutes + "_" + seconds + '.json';
        if(req.query.check=="excel"){
			const wb = getExcelFromArray(arrayDataUser, res, downloadfile);
		   //const path = getExcelFromArray(arrayDataUser);
			//res.download(path, downloadfile);
        }
		if(req.query.check=="json1") {
            const jsonDataArray = await getJsonFromArray(arrayData[3], arrayDataJson);
            await jsonfile.writeFile(downloadfilejson, jsonDataArray, function (err) {
                if (err) console.error(err);
				res.header("Content-Type",'application/json');
				res.send(jsonDataArray);
                //res.download(downloadfilejson);
            })
        }
		if(req.query.check=="json2") {
            const jsonDataArray2 = await getJsonFromArray2(arrayDataUser);
            await jsonfile.writeFile(downloadfilejson, jsonDataArray2, function (err) {
                if (err) console.error(err);
				res.header("Content-Type",'application/json');
				res.send(jsonDataArray2);
                //res.download(downloadfilejson);
            })
        }
		if(req.query.check=="pivot") {
			displayExcelFromArray(arrayDataUser, res);
			//console.log(arrayDataUser);
		}
		if(req.query.check=="pivot_wdr") {
			displayExcelFromArrayWdr(arrayDataUser, res);
			//console.log(arrayDataUser);
		}
    } catch (error) {
        throw new Error("No se han podido obtener los datos");
    }
}



getUsers = async (url, token, courseid) => {

    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    var url = url + '/webservice/rest/server.php?wsfunction=core_enrol_get_enrolled_users&courseid=' + courseid + '&moodlewsrestformat=json';
    var options = {
        url: url,
        method: 'GET',
        headers: headers,
        qs: {
            'wstoken': token
        }
    }
    try {
        let response = await request(options);
        // Print out the response body
        var arrayUsers = [];
        response = JSON.parse(response);
        for (let resp of response) {
            //filtro por rol de alumno
            if (resp.roles[0].roleid == 5) {
                arrayUsers.push({
                    id: resp.id,
                    fullname: resp.fullname,
                });
            }
        }
        return arrayUsers;
    } catch (error) {
        console.log("Ha habido un error")
        throw error;
    }

    
    
}

getGradesReport = async (url, token, workshopid) => {
    var arrayAssessments = [];
    var arraySubmissions = [];
    var arrayData = [];
    var arrayFeedbackFinal = [];
    var arrayAsp = [];
    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    var options = {
        url: url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_grades_report&workshopid=' + workshopid + '&moodlewsrestformat=json',
        method: 'GET',
        headers: headers,
        qs: {
            'wstoken': token
        }
    }
    try {
    let response = await request(options);
    let respuesta = JSON.parse(response);
    if(respuesta.errorcode=="nothingfound"){
        arrayData = [];
        return arrayData;
    }
    var arrayReports = respuesta.report.grades;
    for (let arrayReport of arrayReports) {
        for (let reviewedby of arrayReport.reviewedby) {
            arrayData.push({
                submissionid: arrayReport.submissionid,
                userReviewed: arrayReport.userid,
                totalGrade: arrayReport.submissiongrade,
                userReviewer: reviewedby.userid,
                assessmentid: reviewedby.assessmentid,
                gradeTotalAspects: reviewedby.grade,
            })
            arrayAssessments.push({
                assessmentid: reviewedby.assessmentid,
            })
            arraySubmissions.push({
                submissionid: arrayReport.submissionid,
                assessmentid: reviewedby.assessmentid,
                userReviewed: arrayReport.userid,
                userReviewer: reviewedby.userid,
            })
        }
    }
    if (arrayAssessments.length == 0){
        arrayData = [];
        return arrayData;
    }

    for (let assessment of arrayAssessments) {
        var optionsAssessment = {
            url: url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_assessment&moodlewsrestformat=json',
            method: 'GET',
            headers: headers,
            qs: {
                'wstoken': token,
                'assessmentid': assessment.assessmentid,
            }
        }
        let responseAssess = await request(optionsAssessment);
        var respuestaAssessment = JSON.parse(responseAssess);
        
        arrayFeedbackFinal.push({
            feedbackFinal: respuestaAssessment.assessment.feedbackauthor,
            reviewer: respuestaAssessment.assessment.reviewerid,
            assessmentid: assessment.assessmentid,
        });
        var optionsForm = {
            url: url + '/webservice/rest/server.php?wsfunction=mod_workshop_get_assessment_form_definition&moodlewsrestformat=json',
            method: 'GET',
            headers: headers,
            qs: {
                'wstoken': token,
                'assessmentid': assessment.assessmentid,
            }
        }
        let responseForm = await request(optionsForm);

        var respuestaForm = JSON.parse(responseForm);
        if (respuestaForm.current.length > 0) {
            arrayAsp.push({
                // grade1: (respuestaForm.current[1].value - 1) / (10),
                // grade2: (respuestaForm.current[4].value - 1) / (10),
                // grade3: (respuestaForm.current[7].value - 1) / (10),
				grade1: respuestaForm.current[1].value,
                grade2: respuestaForm.current[4].value,
                grade3: respuestaForm.current[7].value,
                feedback1: respuestaForm.current[2].value,
                feedback2: respuestaForm.current[5].value,
                feedback3: respuestaForm.current[8].value,
                assessmentid: assessment.assessmentid,
            })
        } else {
            arrayAsp.push({
                grade1: null,
                grade2: null,
                grade3: null,
                feedback1: '',
                feedback2: '',
                feedback3: '',
                assessmentid: assessment.assessmentid,
            })
        }
    }

    return [arrayData, arrayFeedbackFinal, arrayAsp, arraySubmissions];
    } catch (error) {
        throw error;
    }
    // eslint
}


getMatchData = async (array) => {
    var arrayUsers = array[0];
    var arrayData = array[1];
    var arrayFeedback = array[2];
    var arrayAspects = array[3];
    var Self = 0;
    var arrayDataUser = [];
    var reviewed = [];
    var reviewer = [];
    for (let i = 0; i < arrayData.length; i++) {
        for (let l = 0; l < arrayUsers.length; l++) {
            if (arrayData[i].userReviewed == arrayUsers[l].id) {
                reviewed.push({
                    nameUserReviewed: arrayUsers[l].fullname,
                })
            }

            if (arrayData[i].userReviewer == arrayUsers[l].id) {
                reviewer.push({
                    nameUserReviewer: arrayUsers[l].fullname,
                })
            }
        }
            arrayDataUser.push({
                nameUserReviewed: reviewed[i].nameUserReviewed,
                nameUserReviewer: reviewer[i].nameUserReviewer,
            })


         arrayDataUser.push({
             totalGrade: arrayData[i].totalGrade,
             totalGradeAspects: arrayData[i].gradeTotalAspects,
         })
         for (let j = 0; j < arrayFeedback.length; j++) {
             if (arrayData[i].assessmentid == arrayFeedback[j].assessmentid) {
                 arrayDataUser.push({
                     feedbackFinal: arrayFeedback[j].feedbackFinal,
                 })
             }
         }

         for (let k = 0; k < arrayAspects.length; k++) {
             if (arrayData[i].assessmentid == arrayAspects[k].assessmentid) {

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
         if (arrayData[i].userReviewed == arrayData[i].userReviewer) {
             Self = 1;
         }
         arrayDataUser.push({
             Self: Self,
         })
         Self = 0;
    }
    return arrayDataUser;

}

getExcelFromArray = async (array,response, filename) => {

    var arrayExcel = [];

    for (let i = 0; i < array.length; i += 5) {
        arrayExcel.push({
            nameUserReviewed: array[0 + i].nameUserReviewed,
            nameUserReviewer: array[0 + i].nameUserReviewer,
            totalGrade: array[1 + i].totalGrade,
            totalGradeAspects: array[1 + i].totalGradeAspects,
            feedbackFinal: array[2 + i].feedbackFinal,
            grade1: array[3 + i].grade1,
            feedback1: array[3 + i].feedback1,
            grade2: array[3 + i].grade2,
            feedback2: array[3 + i].feedback2,
            grade3: array[3 + i].grade3,
            feedback3: array[3 + i].feedback3,
            Self: array[4 + i].Self,
        })
    }
    var workbook = new Excel.Workbook();
    var worksheet = workbook.addWorksheet('Notas');
    worksheet.columns = [{
            header: 'Reviewed',
            width: 50
        },
        {
            header: 'Reviewer',
            width: 50
        },
        {
            header: 'Final Grade',
            width: 10
        },
        {
            header: 'Final Grade Aspects',
            width: 10
        },
        {
            header: 'Feedback Final',
            width: 50
        },
        {
            header: 'Grade Aspect 1',
            width: 10
        },
        {
            header: 'Feedback Aspect 1',
            width: 50
        },
        {
            header: 'Grade Aspect 2',
            width: 10
        },
        {
            header: 'Feedback Aspect 2',
            width: 50
        },
        {
            header: 'Grade Aspect 3',
            width: 10
        },
        {
            header: 'Feedback Aspect 3',
            width: 50
        },
        {
            header: 'Self',
            width: 10
        },
    ];

    for (let elem of arrayExcel) {
        worksheet.addRow([elem.nameUserReviewed, elem.nameUserReviewer, elem.totalGrade, elem.totalGradeAspects, elem.feedbackFinal, elem.grade1, elem.feedback1, elem.grade2, elem.feedback2, elem.grade3, elem.feedback3, elem.Self]);
    }
    try{
		response.setHeader('Content-Type', 'application/vnd.openxmlformats');
		response.setHeader("Content-Disposition", "attachment; filename=" + filename);
		workbook.xlsx.write(response).then(function(){
			response.end();
		});
	}catch (error){
		console.log(error);   
	}

}

getJsonFromArray2 = async (array) => {
    var arrayJson = [];

    for (let i = 0; i < array.length; i += 5) {
        arrayJson.push({
            Submitter: array[0 + i].nameUserReviewed,
            Reviewer: array[0 + i].nameUserReviewer,
            AvgTotalGrade: array[1 + i].totalGrade,
            ReviewerTotalGrade: array[1 + i].totalGradeAspects,
            GlobalFeedback: array[2 + i].feedbackFinal,
            Rubric1Grade: array[3 + i].grade1,
            Rubric1Feedback: array[3 + i].feedback1,
            Rubric2Grade: array[3 + i].grade2,
            Rubric2Feedback: array[3 + i].feedback2,
            Rubric3Grade: array[3 + i].grade3,
            Rubric3Feedback: array[3 + i].feedback3,
            SelfAssessment: array[4 + i].Self,
        })
    }
    try{
		var myJson = await JSON.stringify(arrayJson); 
		return myJson;
	}catch (error){
		console.log(error);   
	}
	
}

displayExcelFromArray = async (array,response) => {

    var arrayExcel = [];

    for (let i = 0; i < array.length; i += 5) {
        arrayExcel.push({
            Submitter: array[0 + i].nameUserReviewed,
            Reviewer: array[0 + i].nameUserReviewer,
            AvgTotalGrade: array[1 + i].totalGrade,
            ReviewerTotalGrade: array[1 + i].totalGradeAspects,
            GlobalFeedback: array[2 + i].feedbackFinal,
            Rubric1Grade: array[3 + i].grade1,
            Rubric1Feedback: array[3 + i].feedback1,
            Rubric2Grade: array[3 + i].grade2,
            Rubric2Feedback: array[3 + i].feedback2,
            Rubric3Grade: array[3 + i].grade3,
            Rubric3Feedback: array[3 + i].feedback3,
            SelfAssessment: array[4 + i].Self,
        })
    }
  
	// var arrayJSON = [];
    // for (let elem of arrayExcel) {
        // arrayJSON.push({elem.nameUserReviewed, elem.nameUserReviewer, elem.totalGrade, elem.totalGradeAspects, elem.feedbackFinal, elem.grade1, elem.feedback1, elem.grade2, elem.feedback2, elem.grade3, elem.feedback3, elem.Self});
    // }
    try{
		//var myJson = await JSON.stringify(arrayExcel); 
		response.render('grades', {data:arrayExcel});     
	}catch (error){
		console.log(error);   
	}

}

displayExcelFromArrayWdr = async (array,response) => {

    var arrayExcel = [];

    for (let i = 0; i < array.length; i += 5) {
        arrayExcel.push({
            Submitter: array[0 + i].nameUserReviewed,
            Reviewer: array[0 + i].nameUserReviewer,
            AvgTotalGrade: array[1 + i].totalGrade,
            ReviewerTotalGrade: array[1 + i].totalGradeAspects,
            GlobalFeedback: array[2 + i].feedbackFinal,
            Rubric1Grade: array[3 + i].grade1,
            Rubric1Feedback: array[3 + i].feedback1,
            Rubric2Grade: array[3 + i].grade2,
            Rubric2Feedback: array[3 + i].feedback2,
            Rubric3Grade: array[3 + i].grade3,
            Rubric3Feedback: array[3 + i].feedback3,
            SelfAssessment: array[4 + i].Self,
        })
    }
  
	// var arrayJSON = [];
    // for (let elem of arrayExcel) {
        // arrayJSON.push({elem.nameUserReviewed, elem.nameUserReviewer, elem.totalGrade, elem.totalGradeAspects, elem.feedbackFinal, elem.grade1, elem.feedback1, elem.grade2, elem.feedback2, elem.grade3, elem.feedback3, elem.Self});
    // }
    try{
		//var myJson = await JSON.stringify(arrayExcel); 
		response.render('grades_wdr', {data:arrayExcel});     
	}catch (error){
		console.log(error);   
	}

}

getMatchJson = async (array) => {
    var arrayUsers = array[0];
    var arrayData = array[1];
    var arrayFeedback = array[2];
    var arrayAspects = array[3];
    var Self = 0;
    var arrayDataJson = [];
    var reviewed = [];
    var reviewer = [];
    for (let i = 0; i < arrayData.length; i++) {
        for (let l = 0; l < arrayUsers.length; l++) {
            if (arrayData[i].userReviewed == arrayUsers[l].id) {
                reviewed.push({
                    idUserReviewed: arrayUsers[l].id,
                    nameUserReviewed: arrayUsers[l].fullname,
                })
            }

            if (arrayData[i].userReviewer == arrayUsers[l].id) {
                reviewer.push({
                    idUserReviewer: arrayUsers[l].id,
                    nameUserReviewer: arrayUsers[l].fullname,
                })
            }
        }
        arrayDataJson.push({
                nameUserReviewed: reviewed[i].nameUserReviewed,
                idUserReviewed: reviewed[i].idUserReviewed,
                nameUserReviewer: reviewer[i].nameUserReviewer,
                idUserReviewer: reviewer[i].idUserReviewer,
            })

         arrayDataJson.push({
             totalGrade: arrayData[i].totalGrade,
             totalGradeAspects: arrayData[i].gradeTotalAspects,
         })
         for (let j = 0; j < arrayFeedback.length; j++) {
             if (arrayData[i].assessmentid == arrayFeedback[j].assessmentid) {
                 arrayDataJson.push({
                     feedbackFinal: arrayFeedback[j].feedbackFinal,
                 })
             }
         }

         for (let k = 0; k < arrayAspects.length; k++) {
             if (arrayData[i].assessmentid == arrayAspects[k].assessmentid) {

                 arrayDataJson.push({
                     grade1: arrayAspects[k].grade1,
                     feedback1: arrayAspects[k].feedback1,
                     grade2: arrayAspects[k].grade2,
                     feedback2: arrayAspects[k].feedback2,
                     grade3: arrayAspects[k].grade3,
                     feedback3: arrayAspects[k].feedback3,
                     assessmentid: arrayAspects[k].assessmentid,
                 })
             }
         }
         if (arrayData[i].userReviewed == arrayData[i].userReviewer) {
             Self = 1;
         }
         arrayDataJson.push({
             Self: Self,
         })
         Self = 0;
    }
    return arrayDataJson;

}

getJsonFromArray = async (arraySub, arrayMatch) => {
    arrayJson = [];
    arrayAux = [];
        for (let i = 0; i < arrayMatch.length; i += 5) {
            arrayAux.push({
                nameUserReviewed: arrayMatch[0 + i].nameUserReviewed,
                nameUserReviewer: arrayMatch[0 + i].nameUserReviewer,
                idUserReviewed: arrayMatch[0 + i].idUserReviewed,
                idUserReviewer: arrayMatch[0 + i].idUserReviewer,
                totalGrade: arrayMatch[1 + i].totalGrade,
                totalGradeAspects: arrayMatch[1 + i].totalGradeAspects,
                feedbackFinal: arrayMatch[2 + i].feedbackFinal,
                grade1: arrayMatch[3 + i].grade1,
                feedback1: arrayMatch[3 + i].feedback1,
                grade2: arrayMatch[3 + i].grade2,
                feedback2: arrayMatch[3 + i].feedback2,
                grade3: arrayMatch[3 + i].grade3,
                feedback3: arrayMatch[3 + i].feedback3,
                assessmentid: arrayMatch[3 + i].assessmentid,
                Self: arrayMatch[4 + i].Self,
            })
    }
        for (let j = 0; j < arraySub.length; j++) {
            if(arrayJson.length==0){
            arrayJson.push({
                submissionid: arraySub[j].submissionid,

            })
            }else{
                if(arraySub[j].submissionid!=arraySub[j-1].submissionid){
                    arrayJson.push({
                        submissionid: arraySub[j].submissionid,

                    })
                }
            }
            for (let l = 0; l < arrayAux.length; l++) {
            if(arrayAux[l].idUserReviewed==arraySub[j].userReviewed && arrayAux[l].idUserReviewer == arraySub[j].userReviewer && arrayAux[l].assessmentid == arraySub[j].assessmentid){
            arrayJson.push({
                DataUser: arrayAux[l]
            })
            }
        }
    }
    var myJson = await JSON.stringify(arrayJson); 
    return myJson;
}