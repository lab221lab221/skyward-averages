// Use this in the Scriptable app on IOS.

var browser = new WebView();

const username = "YOUREMAIL@ORGANIZATION.COM";
const password = "YOURPASSWORD";

var headers = {
  'authority': 'skyward.cvschools.org', 
  'method': 'POST', 
  'path': '<PLACEHOLDER>', 
  'scheme': 'https', 
  'Accept': 'text/html, */*; q=0.01', 
  'Accept-Encoding': 'gzip, deflate', 
  'Accept-Language': 'en-US,en;q=0.9', 
  'Content-Length': '<PLACEHOLDER>', 
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 
  'Origin': 'https://skyward.cvschools.org', 
  'Referer': '<PLACEHOLDER>', 
  'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"', 
  'Sec-Ch-Ua-Arch': '"arm"', 
  'Sec-Ch-Ua-Bitness': '"64"', 
  'Sec-Ch-Ua-Full-Version': '"121.0.6167.139"',
  'Sec-Ch-Ua-Full-Version-List': '"Not A(Brand";v="99.0.0.0", "Google Chrome";v="121.0.6167.139", "Chromium";v="121.0.6167.139"', 
  'Sec-Ch-Ua-Mobile': '?0', 
  'Sec-Ch-Ua-Model': '""', 
  'Sec-Ch-Ua-Platform': '"macOS"', 
  'Sec-Ch-Ua-Platform-Version': '"14.2.1"', 
  'Sec-Fetch-Dest': 'empty', 
  'Sec-Fetch-Mode': 'cors', 
  'Sec-Fetch-Site': 'same-origin', 
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 
  'X-Csrf-Token': '<PLACEHOLDER>',
  'X-Requested-With': 'XMLHttpRequest'
};

function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi, function (match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
}


async function returnHTML(browser) {
  var output = await browser.evaluateJavaScript("document.getElementsByTagName('html')[0].outerHTML;")
  return output;
}

async function find_all(browser, key) {
  return await browser.evaluateJavaScript("var output = []; for (const element of document.getElementsByTagName(\"" + key + "\")) {output.push(element.outerHTML);}; output;");
}

async function get_attr_names(browser, tag, index) {
  return await browser.evaluateJavaScript("document.getElementsByTagName(\"" + tag + "\")[" + index.toString() + "].getAttributeNames();");
}

async function get_attr(browser, tag, index, name) {
  return await browser.evaluateJavaScript("document.getElementsByTagName(\"" + tag + "\")[" + index.toString() + "].getAttribute(\"" + name + "\");");
}

async function set_attr(browser, tag, index=0, name, value) { 
  await browser.evaluateJavaScript("document.getElementsByTagName(\"" + tag + "\")[" + index.toString() + "].setAttribute(\"" + name + "\", \"" + value + "\");")
  return browser;
}

async function render(browser, baseURL="https://skyward.cvschools.org") {
  var output = await find_all(browser, "script");
  var l = 0;
  for (i in output) {
    try {
      var link = await get_attr(browser, "script", l, "src");
      if (link == null) {
        i = await browser.evaluateJavaScript("document.getElementsByTagName('script')[" + l + "].innerHTML;");
      } else {
        if (link.charAt(0) == "/" && link.charAt(1) != "/") {
          var some = new Request(baseURL + link);
        } else {
          var some = new Request("https:" + link);
        }
        i = await some.loadString();
      }
    } catch(e) {}
    try {
      await browser.evaluateJavaScript(i);
    } catch(e) {}
    l += 1;
  }
  return browser;
}

async function GradeReturn(assignmentID, body, xcsrf, browser) {
  var p = await browser.evaluateJavaScript("window.location.href.split('?')[1].split('p=')[1].split('&')[0]");
  var w = await browser.evaluateJavaScript("var w = (window.location.href).split('w='); w = w[w.length-1]; w = w.split('&')[0]; w");
  
  var assignment = new Request("https://skyward.cvschools.org/Student/Gradebook/Assignment/StudentAssignmentDetailsPopupStudentAccess/" + assignmentID + "?w=" + w + "&p=" + p);
  assignment.method = "POST";
  assignment.body = body;
  headers["Content-Length"] = assignment.body.length.toString();
  headers["Referer"] = "https://skyward.cvschools.org/Student/Gradebook/ProgressReport/GradeBucketBreakdownStudentAccess/" + assignmentID + "?w=" + w + "&p=" + p;
  headers["path"] = "/Student/Gradebook/Assignment/StudentAssignmentDetailsPopupStudentAccess/" + assignmentID + "?w=" + w;
  headers["X-Csrf-Token"] = xcsrf;
  assignment.headers = headers;
  
  await browser.loadRequest(assignment);
  
  var HtmlView = new WebView();
  HtmlView.loadHTML(await returnHTML(browser));
  await HtmlView.waitForLoad();
  
  var points = await HtmlView.evaluateJavaScript("document.getElementsByTagName('fieldset')[2].innerHTML;");
  var points = await HtmlView.evaluateJavaScript("document.getElementsByTagName('fieldset')[5].getElementsByTagName('input')[0].getAttribute('value');");
  points = points.split(" / ")[1];
  var average = await HtmlView.evaluateJavaScript("document.getElementsByTagName('fieldset')[6].getElementsByTagName('input')[0].getAttribute('value');");
  average = parseFloat(average.substring(0, average.length-1)) / 100;
  average = average * points;
  
  return [average, points];
}

// Making the initial request to connect Microsoft to Skyward
var homeReq = new Request("https://skyward.cvschools.org/StudentSTS/Session/Signin?area=Home&controller=Home&action=Index#1");
var home = await homeReq.loadString();
await browser.loadURL("https://skyward.cvschools.org");
await render(browser, "https://skyward.cvschools.org");
await browser.present(true);
await browser.evaluateJavaScript("document.getElementsByTagName('button')[1].click();");
await browser.evaluateJavaScript("document.getElementsByTagName('button')[5].click();");
await browser.waitForLoad();
await browser.evaluateJavaScript("document.forms[0].submit();");
await browser.waitForLoad();
await render(browser, "https://login.microsoftonline.com");

// At this point, we have made it to the Microsoft login page.
var found = false;
for (i=0; i<(await find_all(browser, "div")).length; i++) {
  if (await get_attr(browser, "div", i, "class") != "table") {
    continue;
  }
  if (await get_attr(browser, "div", i, "role") != "button") {
    continue;
  }
  if (await get_attr(browser, "div", i, "data-test-id") != username) {
    continue;
  }
  found = true;
  await browser.evaluateJavaScript("document.getElementsByTagName(\"div\")[" + i.toString() + "].click();");
  output = await find_all(browser, "script");
  for (i in output) {
    await browser.evaluateJavaScript(i);
  }
}

// This is a check for whether or not the user has logged into Microsoft previously. If it does not show, then the program presents the browser to the user to log in to Microsoft. The program then closes after this action is complete.
if ("skyward.cvschools.org" == (await browser.evaluateJavaScript("window.location.href;")).split("//")[1].split("/")[0]) {
  found = true;
} else {
if (!found) {
  var warn = new Alert();
  warn.message = "First time login: Please login manually to Skyward."
  warn.addAction("Ok");
  await warn.present();
  await browser.present();
  return;
}

// This is a continuance of the Microsoft login program.
output = await find_all(browser, "script");
for (i in output) {
  await browser.evaluateJavaScript(i);
}

for (let i=0; i<(await find_all(browser, "input")).length; i++) {
  let name = await get_attr(browser, "input", i, "name");
  let value = await get_attr(browser, "input", i, "value");
  switch (name) {
    case "ps":
      await browser.evaluateJavaScript("document.getElementsByTagName(\"input\")[" + i + "].setAttribute(\"value\", \"" + "2" + "\");");
      break;
    case "login":
      await browser.evaluateJavaScript("document.getElementsByTagName(\"input\")[" + i + "].setAttribute(\"value\", \"" + username + "\");");
      break;
    case "loginfmt":
      await browser.evaluateJavaScript("document.getElementsByTagName(\"input\")[" + i + "].setAttribute(\"value\", \"" + username + "\");");
      break;
    case "passwd":
      await browser.evaluateJavaScript("document.getElementsByTagName(\"input\")[" + i + "].setAttribute(\"value\", \"" + password + "\");");
      break;
    case "i19":
      await browser.evaluateJavaScript("document.getElementsByTagName(\"input\")[" + i + "].setAttribute(\"value\", \"" + "34" + "\");");
      break;
  }
  value = await get_attr(browser, "input", i, "value");
}
await browser.evaluateJavaScript("document.getElementsByTagName(\"form\")[0].submit();");

await browser.waitForLoad();
await browser.evaluateJavaScript("document.forms[0].submit();");
await browser.waitForLoad();
}

// At this point, we have made it to the Skyward home page
await browser.present(true);

await browser.evaluateJavaScript("var tile = document.getElementsByTagName('a')[23]; tile.click();");

await browser.waitForLoad();
await render(browser, "https://skyward.cvschools.org");

var courseGrades = {};
var classLength = await browser.evaluateJavaScript("document.getElementsByTagName('tbody')[2].rows.length;");
var courseID = 0;
var courseName = "";

// This loop compiles all relevant link ids as keys for courseGrades. Each key has a value that is an array of [COURSE_NAME, AVERAGE_POINTS, TOTAL_POINTS].
for (let i=0; i<classLength; i++) {
  courseID = await browser.evaluateJavaScript("document.getElementsByTagName('tbody')[2].getElementsByTagName('tr')[" + i + "].getElementsByTagName('td')[6].getAttribute('data-student-grade-bucket-id');");
  if (courseID == null) {
    continue;
  }
  courseName = await browser.evaluateJavaScript("document.getElementsByTagName('tbody')[2].getElementsByTagName('tr')[" + i + "].getElementsByTagName('td')[0].getElementsByTagName('label')[0].innerHTML;");
  courseGrades[courseID] = [courseName, 0, 0];
}

// This loops through each of the course links, and another loop wothin this loop iterates through all of the assignments for the course. for each iteration, the point values are saved in courseGrades.
for (let course=0; course<Object.keys(courseGrades).length; course++) {
  var courseID = Object.keys(courseGrades)[course];
  if (courseID == "null") {
    continue;
  }
  
  await browser.loadURL("https://skyward.cvschools.org/Student/Gradebook/ProgressReport/GradeBucketBreakdownStudentAccess/" + courseID);
  
  await render(browser, "https://skyward.cvschools.org");
  
  var assignments = await browser.evaluateJavaScript("var assignments = {}; var elems = document.getElementsByClassName('browseRow neverHighlight'); for (let i=0; i<elems.length; i++) {var link = elems[i].getElementsByTagName('a')[0]; assignments[link.getAttribute('data-assignment-id')] = [link.getAttribute('data-student-section-id'), link.getAttribute('data-student-grade-bucket-id')];} assignments");
  
  var bodyStuff = Object.values(assignments)[0];
  bodyStuff = "StudentSectionID=" + bodyStuff[0] + "&StudentGradeBucketID=" + bodyStuff[1];
  
  var xcsrf = await browser.evaluateJavaScript("window._skyward.global.sessionGuidHash;");
  
  var grade = undefined;
  for (let assignment=0; assignment<Object.keys(assignments).length; assignment++) {
    grade = await GradeReturn(Object.keys(assignments)[assignment], bodyStuff, xcsrf, browser);
    courseGrades[courseID][1] = parseFloat(courseGrades[courseID][1]) + parseFloat(grade[0] || 0);
    courseGrades[courseID][2] = parseFloat(courseGrades[courseID][2]) + parseFloat(grade[1] || 0);
    var progress = ((course / Object.keys(courseGrades).length) + ((1 / Object.keys(courseGrades).length) * ((assignment + 1) / Object.keys(assignments).length))) * 100;
    console.log(progress + "%");
  }
}

// This final loop calculates the average percentages.
finalAverages = {};
for (let i=0; i<Object.values(courseGrades).length; i++) {
  var data = Object.values(courseGrades)[i];
  if (data[2] != 0) {
    finalAverages[data[0]] = (data[1] / data[2]) * 100;
  } else {
    finalAverages[data[0]] = 0;
  }
}
console.log(finalAverages);
