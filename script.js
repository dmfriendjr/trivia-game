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
		this.questionContainer = document.getElementsByClassName('question-wrapper')[0];
		this.messageDisplay = document.getElementById('message-display');
		this.questionTimerDisplay = document.getElementById('question-timer-display');
		this.questionDisplay = $('#question-display');
		this.answerSlots = $('.answer-option');
		this.categoriesDisplay = $('#categories-display');
		this.categoryOptionsDisplay = document.getElementsByClassName('category-option');
		this.scoreScreenDisplay = document.getElementById('score-screen-wrapper');
		this.correctAnswersDisplay = document.getElementById('correct-answers-display');
		this.incorrectAnswersDisplay = document.getElementById('incorrect-answers-display');
		this.questionTimerInterval;
		this.questionTimer = 0;
		this.numberIncorrectAnswers = 0;
		this.numberCorrectAnswers = 0;
	}

	initialize() {
		//Add event listeners to answer slots
		console.log('Initializing');
		for (let i = 0; i < this.answerSlots.length; i++){
			$(this.answerSlots[i]).on('click',this.checkAnswer.bind(this));
		}
		//Add event listeners to category slots
		//Add event listener to restart button
		$('#restart-button').on('click', this.resetGame.bind(this));
		//Begin categories http request
		this.requestCategoriesData();
	}
	
	//This uses an async operation to request and wait for response from requested url
	httpGetAsync(theUrl, callback){
		$.ajax({
			url: theUrl,
			method: "GET"
		}).done(callback);	
	}
	
	//Request async the questions data and process response when ready
	requestQuestionsData(categoryId) {
		this.httpGetAsync(`https://opentdb.com/api.php?amount=10&category=${categoryId}`, this.populateQuestions.bind(this));
	}
	
	//Request async the categories data and process response when ready
	requestCategoriesData() {
		console.log('Requesting data');
		this.httpGetAsync('https://opentdb.com/api_category.php', (response) => 
		{		
			this.categoriesList = response.trivia_categories;
			console.log('Got response');
			this.populateCategories();
		});
	}

	populateQuestions(questionsData) {
		//Parse JSON response and grab results array
		questionsData = questionsData.results;
		//Iterate over questions data and make a new TriviaQuestion for each question in the daa
		for(let i = 0; i < questionsData.length; i++) {
			//Add correct answer to incorrect answers array
			let answersArray = questionsData[i].incorrect_answers;
			answersArray.push(questionsData[i].correct_answer);
			let correctAnswerIndex;
			if (answersArray.length === 2) {
				//This question is a true or false, need to do special handling so order doesn't give away answer
				answersArray[0] = 'True';
				answersArray[1] = 'False';
				correctAnswerIndex = questionsData[i].correct_answer === 'True' ? 0 : 1;
			}
			else {
				//Randomize position of correct answer in the answers array and store the location of answer
				correctAnswerIndex = Math.floor(Math.random() * answersArray.length);
				//Check if random index was last index, meaing we don't need to swap
				if (correctAnswerIndex !== answersArray.length-1){
					let answerHolder = answersArray[correctAnswerIndex];
					//Swap correct answer (at last index because of push) with random index
					answersArray[correctAnswerIndex] = answersArray[answersArray.length-1];
					answersArray[answersArray.length-1] = answerHolder;
				}
			}


			//Add newly instantiated trivia question object to questions array	
			this.questionsList.push(new TriviaQuestion(questionsData[i].question,
				answersArray,correctAnswerIndex));	
		}	
		//Display question container on HTML
		this.questionContainer.style.display = 'block';
		//Display first question
		this.nextQuestion();
	}

	//Display a category in each category slot for data recieved
	populateCategories() {
		//Display categories display wrapper
		this.toggleCategoriesDisplay(true);
		//Get children and fill with each category
		for (let i = 0; i < this.categoriesList.length; i++) {
			//Create wrapper
			let categoryWrapper = $('<div>', {
				"class": 'category-wrapper',
				click: (event) => {
					//On click, request questions data and toggle categories display off
					this.requestQuestionsData(event.target.dataset.categoryId);
					this.toggleCategoriesDisplay(false);
				}
			});

			//Create category option content
			let categoryOption = $('<p>', {
				"class": 'category-option',
				"data-category-id": this.categoriesList[i].id,
				//Fill div with content
				text: this.categoriesList[i].name
			});
			//Append content to wrapper, and wrapper to display 
			categoryWrapper.append(categoryOption);
			this.categoriesDisplay.append(categoryWrapper);
		}
	}

	toggleCategoriesDisplay(doDisplay) {
		if (doDisplay) {
			this.categoriesDisplay.show();
		} else {
			this.categoriesDisplay.hide();
		}
	}

	toggleQuestionsDisplay(doDisplay) {
		if (doDisplay) {
			this.questionDisplay.show();
		} else {
			this.questionDisplay.hide();
		}
	}

	chooseCategory(event) {
		//Request questions data
		this.requestQuestionsData(event.target.dataset.categoryId);
		//Toggle category display
		this.toggleCategoriesDisplay(false);
	}

	nextQuestion() {
		//Advance to next question
		this.questionIndex++;
		//New question, answer hasn't been picked
		this.answerPicked = false;
		//Reset timer and start countdown
		this.questionTimer = 30;
		this.questionTimerDisplay.innerHTML = this.questionTimer;	
		this.questionTimerInterval = setInterval(this.updateQuestionTimer.bind(this),1000);
		//Get current question
		let currentQuestion = this.questionsList[this.questionIndex];
		//Reset win/lost/times up message
		this.updateMessageDisplay('');
		//Populate HTML
		this.questionDisplay.html(currentQuestion.question);

		for (let i = 0; i <  currentQuestion.answers.length; i++)
		{
			this.answerSlots[i].innerHTML = currentQuestion.answers[i];
		}
		//Check if question is a true/false, need to clear 3rd and 4th slots if so
		if (currentQuestion.answers.length < 4) {
			this.answerSlots[2].style.display = 'none'
			this.answerSlots[3].style.display = 'none';
		} else {
			//Ensure they are displayed otherwise
			this.answerSlots[2].style.display = 'inline-block';
			this.answerSlots[3].style.display = 'inline-block';
		}
	}

	checkAnswer(event) {
		//User has picked answer already, don't want to process the input
		if (this.answerPicked) {
			return; 	
		}

		if (event.target.innerHTML === this.questionsList[this.questionIndex].correctAnswer) {
			event.target.classList.add('correct-answer');
			this.updateMessageDisplay('That\'s Correct!');
			this.numberCorrectAnswers++;
		} else {
			event.target.classList.add('incorrect-answer');
			this.updateMessageDisplay('Wrong!');
			this.answerSlots[this.questionsList[this.questionIndex].correctAnswerIndex].classList.add('correct-answer');
			this.numberIncorrectAnswers++;
		}

		//Answer has been clicked 
		this.answerPicked = true;
		//Determine if we want to advance to the next question (ie there are questions left)
		//Have to do length-1 here since questionsIndex gets incremented by nextQuestion()
		if (this.questionIndex < this.questionsList.length-1){	
			//do a small delay then advance to next question and reset answer styles
			this.nextQuestionTimerStart();
		} else {
			//No questions left, hide questions, clear interval, display score
			clearInterval(this.questionTimerInterval);
			setTimeout(this.displayScoreScreen.bind(this),3000);
		}
	}

	questionTimeElapsed() {
		this.updateMessageDisplay('Time\'s Up!');
		this.answerSlots[this.questionsList[this.questionIndex].correctAnswerIndex].classList.add('correct-answer');
		this.nextQuestionTimerStart();
	}

	nextQuestionTimerStart() { 
		//Clear question timer interval
		clearInterval(this.questionTimerInterval);
		//Give 3 seconds before resetting answer styling and going to next question
		setTimeout(this.resetAnswerStyles.bind(this), 3000);
		setTimeout(this.nextQuestion.bind(this), 3000);
	}

	resetAnswerStyles() {
		for (let i = 0; i < this.answerSlots.length; i++) {
			this.answerSlots[i].classList.remove('correct-answer');
			this.answerSlots[i].classList.remove('incorrect-answer');
		}
	}

	updateQuestionTimer() {
		this.questionTimer--;
		this.questionTimerDisplay.innerHTML = this.questionTimer;
		if (this.questionTimer <= 0) {
			//Times up, move to next question
			this.questionTimeElapsed();
		}
	}

	updateMessageDisplay(message) {
		this.messageDisplay.innerHTML = message;
	}

	displayScoreScreen() {
		//Hide question container and show score screen
		this.questionContainer.style.display = 'none';
		this.scoreScreenDisplay.style.display = 'block';
		this.correctAnswersDisplay.innerHTML = this.numberCorrectAnswers;
		this.incorrectAnswersDisplay.innerHTML = this.numberIncorrectAnswers;
	}

	resetGame() {
		//Reset variables
		this.questionIndex = -1;
		this.questionsList = [];
		this.answerPicked = false;
		this.numberCorrectAnswers = 0;
		this.numberIncorrectAnswers = 0;
		this.resetAnswerStyles();
		//Hide score screen container
		this.scoreScreenDisplay.style.display = 'none';
		//Display category choices
		this.toggleCategoriesDisplay(true);
	}
} 

let triviaGame = new TriviaGame();
triviaGame.initialize();
