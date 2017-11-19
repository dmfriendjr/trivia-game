let question;
let answers;
let correctAnswer;
let questionIndex = -1;
let questionDisplay = document.getElementById('question-display');
let answersDisplay = document.getElementById('answer-display');
let answerSlots = document.getElementById('answer-display').children;
let categoriesDisplay = document.getElementById('categories-display');
let timerDisplay = document.getElementById('question-timer-display');
let questionsData;
let categoriesData;

let intervalId;
let timeLeft = 0;

function nextQuestion() {
	//Clear previous interval if needed
	clearInterval(intervalId);
	//Advance the queston index and get next question from array
	questionIndex++;
	question = questionsData[questionIndex].question;
	answers = questionsData[questionIndex].incorrect_answers;
	//Store correct answer for later comparison and add it to the answers array
	correctAnswer = questionsData[questionIndex].correct_answer;
	answers.push(correctAnswer);
	//Need to randomize the place of the correct answer in the array
	let randomIndex = Math.floor(Math.random() * answers.length);
	
	//Check if random index was last index or question is true/false, meaning we don't need to swap
	if (randomIndex !== answers.length-1 || answers.length == 2)
	{
		let answerHolder = answers[randomIndex];
		//Swap correct answer (at last index because of push) with random index
		answers[randomIndex] = answers[answers.length-1];
		answers[answers.length-1] = answerHolder;
	}

	//Display question and answers in the HTML
	questionDisplay.innerHTML = question;
	answerSlots = answersDisplay.children;
	for(let i = 0; i < answers.length; i++)
	{
		answerSlots[i].innerHTML = answers[i];

	}
	if (answers.length === 2) {
		//Question is true false, need to ensure no other answers are present
		answerSlots[2].innerHTML = '';
		answerSlots[3].innerHTML = '';
	}

	timeLeft = 30;
	timerDisplay.innerHTML = timeLeft;
	intervalId = setInterval(questionTimer,1000);
}

function questionTimer() {
	timeLeft--;
	timerDisplay.innerHTML = timeLeft;

	if (timeLeft <= 0) {
		clearInterval(intervalId);
		nextQuestion();
	}
}

function checkAnswer(event) {
	if (event.target.innerHTML === correctAnswer) {
		console.log('That\'s right\!');
	} else {
		console.log('That\'s wrong\!');
	}
	nextQuestion();
}

function processData(data) {
	questionsData = JSON.parse(data).results;
	nextQuestion();
}

function processCategories(data) {
	categoriesData = JSON.parse(data).trivia_categories;
	displayCategories();
}

function displayCategories() {
	let categorySlots = categoriesDisplay.children;
	for (let i = 0; i < categoriesData.length; i++) {
		categorySlots[i].innerHTML = categoriesData[i].name;
		categorySlots[i].addEventListener('click',chooseCategory);
	}
}

function chooseCategory(data) {
	let categoryChoice = data.target.innerHTML;
	//Find id related to chosen category
	for (let i = 0; i < categoriesData.length; i++) {
		if (categoriesData[i].name == categoryChoice) {
			httpGetAsync(`https://opentdb.com/api.php?amount=10&category=${categoriesData[i].id}`, processData);
			categoriesDisplay.style.display = "none";
			break;
		}
	}
}

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

//Add event listeners to answer slots
for(let i = 0; i < answerSlots.length; i++)
{
	answerSlots[i].addEventListener('click', checkAnswer);
}

httpGetAsync('https://opentdb.com/api_category.php', processCategories);
