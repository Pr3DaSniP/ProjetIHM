class Quiz {
  _score = 0;
  _questions = [];
  _questionCounter = 0;
  _nbQuestions = 0;
  _note = 0;

  _reponses = [];

  constructor() {}

  async setQuestions(jsonFileName) {
    const response = await fetch(jsonFileName);
    if (!response.ok) {
      throw new Error("Erreur de chargement");
    }
    this._questions = await response.json();
    this._nbQuestions = this._questions.length;
  }

  get questions() {
    return this._questions;
  }

  question(i) {
    return this._questions[i];
  }

  get score() {
    return this._score;
  }

  get questionCounter() {
    return this._questionCounter;
  }

  incrementScore() {
    this._score++;
    this._note = (this._score / this._nbQuestions) * 20;
  }

  decrementQuestionCounter() {
    this._questionCounter--;
  }

  addReponse(reponse) {
    this._reponses.push(reponse);
  }

  get reponses() {
    return this._reponses;
  }

  get note() {
    return this._note;
  }
}

const question = document.querySelector("#question");
const choices = Array.from(document.querySelectorAll(".choice-text"));
const progressText = document.querySelector("#progressText");
const scoreText = document.querySelector("#score");
const progressBarFull = document.querySelector("#progressBarFull");

let currentQuestion = {};
let acceptingAnswers = true;
let questionCounter = 0;
let availableQuestions = [];

function startGame(questions) {
  questionCounter = 0;
  score = 0;
  availableQuestions = [...questions];
  getNewQuestion(questions);
}

function getNewQuestion(questions) {
  if (availableQuestions.length === 0 || questionCounter >= questions.length) {
    const game = document.querySelector(".containerQuiz");
    game.style.display = "none";

    sessionStorage.clear();
    sessionStorage.setItem("note", quiz.note);
    sessionStorage.setItem("reponses", JSON.stringify(quiz.reponses));
  }

  questionCounter++;
  progressText.innerText = `Question ${questionCounter} sur ${questions.length}`;
  progressBarFull.style.width = `${
    (questionCounter / questions.length) * 100
  }%`;
  const questionIndex = Math.floor(Math.random() * availableQuestions.length);
  currentQuestion = availableQuestions[questionIndex];
  question.innerText = currentQuestion.question;

  choices.forEach((choice) => {
    const number = choice.dataset["number"];
    if (currentQuestion.reponsesPossibles[number - 1] !== undefined) {
      const elemToShow = document.getElementById(number);
      elemToShow.style.display = "flex";
      choice.innerText = currentQuestion.reponsesPossibles[number - 1];
    } else {
      const elemToHide = document.getElementById(number);
      elemToHide.style.display = "none";
    }
  });

  availableQuestions.splice(questionIndex, 1);

  acceptingAnswers = true;
}

function incrementScore(num) {
  score += num;
  scoreText.innerText = score;
}

const quizStart = async () => {
  quiz.setQuestions("questions.json").then(() => {
    choices.forEach((choice) => {
      choice.addEventListener("click", (e) => {
        if (!acceptingAnswers) return;
        acceptingAnswers = false;
        const selectedChoice = e.target;
        const selectedAnswer = selectedChoice.dataset["number"];

        quiz.addReponse({
          question: currentQuestion.question,
          reponse: currentQuestion.reponsesPossibles[selectedAnswer - 1],
          bonneReponse:
            currentQuestion.reponsesPossibles[currentQuestion.reponse],
        });

        const classToApply =
          selectedAnswer - 1 == currentQuestion.reponse
            ? "correct"
            : "incorrect";
        if (classToApply === "correct") {
          quiz.incrementScore();
          incrementScore(1);
        }
        selectedChoice.parentElement.classList.add(classToApply);
        setTimeout(() => {
          selectedChoice.parentElement.classList.remove(classToApply);
          getNewQuestion(quiz.questions);
        }, 500);
      });
    });
    startGame(quiz.questions);
  });
};

const quiz = new Quiz();
quizStart();
