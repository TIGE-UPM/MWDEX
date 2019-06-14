//var request = require('request');
var request = require('request-promise');

var Excel = require('exceljs/modern.nodejs');


//llamo a getUsers y también a las siguientes funciones
exports.getInfo = async (req, res) => {
    var size = 0;

    try {
        const arrayUsers = await getUsers(req.query.url, req.query.token, req.query.courseid);
        const arrayData = await getGradesReport(req.query.url, req.query.token, req.query.workshopid);
        let array = [arrayUsers, arrayData[0], arrayData[1], arrayData[2]];
        size = arrayUsers.length + 3 * arrayData[0].length;
        const arrayDataUser = await getMatchData(array, size);
        const path = await getExcelFromArray(arrayDataUser);
        res.download(path, 'notas.xlsx');
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
        }
    }
    console.log(arrayAssessments)
    if (arrayAssessments.length == 0){ 
        return arrayData;
    }
    const promises = [];
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
        promises.push(request(optionsAssessment).then(async (responseAssess) => {
            var respuestaAssessment = JSON.parse(responseAssess);
            console.log(responseAssess);
            console.log(respuestaAssessment)
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
                    grade1: (respuestaForm.current[1].value - 1) / (10),
                    grade2: (respuestaForm.current[4].value - 1) / (10),
                    grade3: (respuestaForm.current[7].value - 1) / (10),
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
        }))

        //console.log(arrayData)
        //console.log(arrayFeedbackFinal)
        //console.log(arrayAsp)

    }
        await Promise.all(promises);
        return [arrayData, arrayFeedbackFinal, arrayAsp];
    } catch (error) {
        throw error;
    }
    // eslint
}


getMatchData = async (array, size) => {
    var arrayUsers = array[0];
    var arrayData = array[1];
    var arrayFeedback = array[2];
    var arrayAspects = array[3];
    var flag = 0;
    var arrayDataUser = [];
    var sizeAux = arrayUsers.length + arrayData.length + arrayFeedback.length + arrayAspects.length;
    console.log("ESTOY AQUI")
    console.log(size);
    console.log(sizeAux);

    //if(sizeAux==size){
    //console.log("Cumple condicion")
    for (let i = 0; i < arrayData.length; i++) {
        for (let l = 0; l < arrayUsers.length; l++) {
            if (arrayData[i].userReviewed == arrayUsers[l].id) {
                arrayDataUser.push({
                    nameUserReviewed: arrayUsers[l].fullname,
                })
            }
            if (arrayData[i].userReviewer == arrayUsers[l].id) {
                arrayDataUser.push({
                    nameUserReviewer: arrayUsers[l].fullname,
                })
            }
        }
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
            flag = 1;
        }
        arrayDataUser.push({
            flag: flag,
        })
        flag = 0;
    }
    //console.log(arrayDataUser)
    return arrayDataUser;
    //}

}

getExcelFromArray = async (array) => {

    var arrayExcel = [];

    for (let i = 0; i < array.length; i += 6) {
        arrayExcel.push({
            nameUserReviewed: array[0 + i].nameUserReviewed,
            nameUserReviewer: array[1 + i].nameUserReviewer,
            totalGrade: array[2 + i].totalGrade,
            totalGradeAspects: array[2 + i].totalGradeAspects,
            feedbackFinal: array[3 + i].feedbackFinal,
            grade1: array[4 + i].grade1,
            feedback1: array[4 + i].feedback1,
            grade2: array[4 + i].grade2,
            feedback2: array[4 + i].feedback2,
            grade3: array[4 + i].grade3,
            feedback3: array[4 + i].feedback3,
            flag: array[5 + i].flag,
        })
    }
    //console.log(arrayExcel);
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
            header: 'Flag',
            width: 10
        },
    ];

    for (let elem of arrayExcel) {
        worksheet.addRow([elem.nameUserReviewed, elem.nameUserReviewer, elem.totalGrade, elem.totalGradeAspects, elem.feedbackFinal, elem.grade1, elem.feedback1, elem.grade2, elem.feedback2, elem.grade3, elem.feedback3, elem.flag]);
    }
    try{
        await workbook.xlsx.writeFile('grades.xlsx');
        return 'grades.xlsx';
    }catch(error){
        throw error;
    }

}