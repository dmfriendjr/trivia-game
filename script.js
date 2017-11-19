class TriviaQuestion {
	constructor(question,answers,correctAnswerIndex) {
		this.question = question;
		this.answers = answers;
		this.correctAnswerIndex = correctAnswerIndex;
	}

	get correctAnswer() {
		return this.answers[this.correctAnswerIndex];
	}
}


class TriviaGame {
	constructor() {
		this.questionsList = [];
		this.questionIndex = -1;
		this.answerPicked = false;
		this.categoriesList = [];
		this.questionDisplay = document.getElementById('question-display');
		this.answerSlots = document.getElementById('answers-display').children;
		this.categoriesDisplay = document.getElementById('categories-display');
		this.intervalId;
	}
	
	//This uses an async operation to request and wait for response from requested url
	httpGetAsync(theUrl, callback)
	{
	    var xmlHttp = new XMLHttpRequest();
	    xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
		    callback(xmlHttp.responseText);
	    }
	    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
	    xmlHttp.send(null);
	}
	
	//Request async the questions data
	requestQuestionsData(categoryId) {
		this.httpGetAsync(`https://opentdb.com/api.php?amount=10&category=${categoryId}`, this.populateQuestions.bind(this));
	}
	
	//Request async the categories data and process response when ready
	requestCategoriesData() {
		this.httpGetAsync('https://opentdb.com/api_category.php', this.processCategories.bind(this));
	}

	populateQuestions(questionsData) {
		//Parse JSON response and grab results array
		questionsData = JSON.parse(questionsData).results;
		//Iterate over questions data and make a new TriviaQuestion for each question in the daa
		for(let i = 0; i < questionsData.length; i++) {
			//Add correct answer to incorrect answers array, shuffle, and store index of correct answer
			let answersArray = questionsData[i].incorrect_answers;
			answersArray.push(questionsData[i].correct_answer);
			let correctAnswerIndex = Math.floor(Math.random() * answersArray.length);
			
			//Check if random index was last index or question is true/false, meaning we don't need to swap
			if (correctAnswerIndex !== answersArray.length-1 || answersArray.length == 2){
				let answerHolder = answersArray[correctAnswerIndex];
				//Swap correct answer (at last index because of push) with random index
				answersArray[correctAnswerIndex] = answersArray[answersArray.length-1];
				answersArray[answersArray.length-1] = answerHolder;
			}

			//Add newly instantiated trivia question object to questions array	
			this.questionsList.push(new TriviaQuestion(questionsData[i].question,
				answersArray,correctAnswerIndex));	
		}	
		//Display first question here for now
		this.nextQuestion();
	}

	//Parse recieved data and display categories so user can pick one
	processCategories(categoriesData) {
		this.categoriesList = JSON.parse(categoriesData).trivia_categories;
		this.displayCategories();
	}

	//Display a category in each category slot (This would break if more categories returned than expected should be dynamic)
	displayCategories() {
		let categorySlots = this.categoriesDisplay.children;
		for (let i = 0; i < this.categoriesList.length; i++) {
			categorySlots[i].innerHTML = this.categoriesList[i].name;
			categorySlots[i].addEventListener('click',this.chooseCategory.bind(this));
		}
		//Putting this here for now but it shouldn't go here
		for (let i = 0; i < this.answerSlots.length; i++)
		{
			this.answerSlots[i].addEventListener('click', this.checkAnswer.bind(this));
		}
	}

	chooseCategory(event) {
		let categoryChoice = event.target.innerHTML;
		//Find id related to chosen category
		for (let i = 0; i < this.categoriesList.length; i++) {
			if (this.categoriesList[i].name == categoryChoice) {
				this.categoriesDisplay.style.display = "none";
				this.requestQuestionsData(this.categoriesList[i].id);
				break;
			}
		}
	}

	nextQuestion() {
		//Advance to next question
		this.questionIndex++;
		//New question, answer hasn't been picked
		this.answerPicked = false;
		
		//Populate HTML
		this.questionDisplay.innerHTML = this.questionsList[this.questionIndex].question;
		for (let i = 0; i <  this.questionsList[this.questionIndex].answers.length; i++)
		{
			this.answerSlots[i].innerHTML = this.questionsList[this.questionIndex].answers[i];
		}
	}

	checkAnswer(event) {
		//User has picked answer, don't want to process the input
		if (this.answerPicked) {
			return; 	
		}

		if (event.target.innerHTML === this.questionsList[this.questionIndex].correctAnswer) {
			event.target.classList.add('correct-answer');
		} else {
			event.target.classList.add('incorrect-answer');
			this.answerSlots[this.questionsList[this.questionIndex].correctAnswerIndex].classList.add('correct-answer');
		}

		//Answer has been clicked, do a small delay then advance to next question and reset answer styles
		this.answerPicked = true;
		setTimeout(this.resetAnswerStyles.bind(this), 3000);
		setTimeout(this.nextQuestion.bind(this), 3000);
	}

	resetAnswerStyles() {
		for (let i = 0; i < this.answerSlots.length; i++) {
			this.answerSlots[i].classList.remove('correct-answer');
			this.answerSlots[i].classList.remove('incorrect-answer');
		}
	}
} 

let triviaGame = new TriviaGame();
triviaGame.requestCategoriesData();

function questionTimer() {
	//Decrement time left, update display, and check if time is up
	timeLeft--;
	timerDisplay.innerHTML = timeLeft;

	if (timeLeft <= 0) {
		clearInterval(intervalId);
		nextQuestion();
	}
}


