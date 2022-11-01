const video = document.querySelector("#inputVideo");
const canvas = document.querySelector("#drawCanvas");
const download_link = document.querySelector("#download-video");
const ctx = canvas.getContext("2d");

///////////////////////////////////////////////////////////////////////////////////////
// Fonctions //
let camera_stream = null;

let datas_emotions = [];
let compteurForSaveData = 0;
let id_annimation = null;
const nbSec = 1;

const setupCamera = async () => {
  camera_stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  video.srcObject = camera_stream;
};

const drawLoop = () => {
  compteurForSaveData++;
  id_annimation = requestAnimationFrame(drawLoop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (ctracker.getCurrentPosition()) {
    ctracker.draw(canvas);
  }
  let cp = ctracker.getCurrentParameters();
  let er = ec.meanPredict(cp);
  if (er) {
    // Toute les nbSec secondes (nbSec * 60 frames) on enregistre les données
    if (compteurForSaveData % (60 * nbSec) == 0) {
      datas_emotions.push(er);
    }
  }
};

/**
 * Returns a promise that resolves to an image element
 * @param {String} type // chart type
 * @param {Object} datas // chart data
 * @param {Object} options // chart options
 * @returns {Promise} // image
 */
const getImageFromChart = async (type, datas, options, context) => {
  let image = new Image();
  let chart = new Chart(context, {
    type: type,
    data: datas,
    options: options,
  });

  return new Promise((resolve, reject) => {
    chart.options.animation.onComplete = () => {
      context.canvas.toBlob((blob) => {
        image.src = URL.createObjectURL(blob);
        chart.destroy();
        resolve(image);
      });
    };
  });
};

/**
 * Converti les données sur les émotions en données utilisable pour les graphiques
 * Ex:
 * [[{emotion: "angry", value: 0.1}, ...], [{emotion: "angry", value: 0.3}, ...]
 * devient
 * [{"Emotion": "Angry", "Value": [0.1, ...]}, {"Emotion": "Sad", "Value": [...]}, ...]
 * Exemple complet : Example.txt
 * @param {*} datas_emotions
 * @returns Les données formatées
 */
const convertToFormat = (datas_emotions) => {
  let datas_emotions_formated = [];
  let emotions = ["angry", "sad", "surprised", "happy", "disgusted", "fear"];
  for (let i = 0; i < emotions.length; i++) {
    let emotion = emotions[i];
    let values = [];
    for (let j = 0; j < datas_emotions.length; j++) {
      let data_emotion = datas_emotions[j];
      for (let k = 0; k < data_emotion.length; k++) {
        let data = data_emotion[k];
        if (data.emotion == emotion) {
          values.push(data.value);
        }
      }
    }
    datas_emotions_formated.push({
      Emotion: emotion,
      Value: values,
    });
  }
  return datas_emotions_formated;
};

/**
 * Créer et retourne un PDF avec les images données en paramètre
 * @param {Data[]} datas
 * @returns PDFDocument
 */
const getPDF = async (datas) => {
  window.jsPDF = window.jspdf.jsPDF;
  let pdf = new jsPDF("p", "mm", "a4");
  pdf.setFontSize(12);
  pdf.text(20, 10, "Résultat : " + datas.Resultat);
  pdf.setFontSize(20);
  pdf.text(20, 25, "Emotions");
  pdf.addImage(datas.images[0], "PNG", 20, 30, 160, 100);
  pdf.text(20, 140, "Répartition des émotions");
  pdf.addImage(
    datas.images[1],
    "PNG",
    pdf.internal.pageSize.getWidth() / 2 - 70, // Taille de la largeur de la page / 2 - taille du graphe / 2
    150,
    140,
    140
  );

  pdf.addPage();
  pdf.text(20, 20, "Emotion : Angry");
  pdf.addImage(datas.images[2], "PNG", 20, 30, 160, 100);
  pdf.text(20, 140, "Emotion : Sad");
  pdf.addImage(datas.images[3], "PNG", 20, 150, 160, 100);

  pdf.addPage();
  pdf.text(20, 20, "Emotion : Surprised");
  pdf.addImage(datas.images[4], "PNG", 20, 30, 160, 100);
  pdf.text(20, 140, "Emotion : Happy");
  pdf.addImage(datas.images[5], "PNG", 20, 150, 160, 100);

  pdf.addPage();
  pdf.text(20, 20, "Emotion : Disgusted");
  pdf.addImage(datas.images[6], "PNG", 20, 30, 160, 100);
  pdf.text(20, 140, "Emotion : Fear");
  pdf.addImage(datas.images[7], "PNG", 20, 150, 160, 100);

  return pdf;
};

/**
 * Créer et propose au téléchargement un PDF avec le résultat de l'analyse
 * @param {*} datas
 */
const saveFile = async (datas) => {
  let datas_emotions = JSON.parse(datas);
  let datas_emotions_formated = convertToFormat(datas_emotions);

  const colors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#00FF00",
    "#FF0000",
    "#0000FF",
  ];
  let linesCanvas = document.getElementById("chart1_canvas");
  let linesCtx = linesCanvas.getContext("2d");

  let chartData = {
    labels: datas_emotions_formated[0].Value.map((v, i) => i),
    datasets: datas_emotions_formated.map((data) => {
      return {
        data: data.Value,
        label: data.Emotion,
        borderColor: colors[datas_emotions_formated.indexOf(data)],
        fill: false,
      };
    }),
  };

  let chartOptions = {
    title: {
      display: true,
      text: "Emotions",
    },
    scales: {
      xAxis: {
        display: true,
        title: {
          display: true,
          text: "Temps (en secondes)",
        },
      },
      yAxis: {
        display: true,
        title: {
          display: true,
          text: "Valeur",
        },
      },
    },
  };

  let moyenneEmotions = datas_emotions_formated.map((data) => {
    return {
      Emotion: data.Emotion,
      Moyenne: data.Value.reduce((a, b) => a + b, 0) / data.Value.length,
    };
  });

  // Création du graphique complet des émotions (courbes)
  let fullEmotionImage = await getImageFromChart(
    "line",
    chartData,
    chartOptions,
    linesCtx
  );

  // Création du graphique des moyennes des émotions (camembert)
  let moyenneEmotionsImage = await getImageFromChart(
    "doughnut",
    {
      labels: moyenneEmotions.map((data) => data.Emotion),
      datasets: [
        {
          data: moyenneEmotions.map((data) => data.Moyenne),
          backgroundColor: colors,
        },
      ],
    },
    {
      title: {
        display: true,
        text: "Répartition des émotions",
      },
    },
    linesCtx
  );

  // Création du graphique de l'emotion angry (courbe)
  let angryEmotionImage = await getImageFromChart(
    "line",
    {
      labels: chartData.labels,
      datasets: [chartData.datasets[0]],
    },
    chartOptions,
    linesCtx
  );

  // Création du graphique de l'emotion sad (courbe)
  let sadEmotionImage = await getImageFromChart(
    "line",
    {
      labels: chartData.labels,
      datasets: [chartData.datasets[1]],
    },
    chartOptions,
    linesCtx
  );

  // Création du graphique de l'emotion surprised (courbe)
  let surprisedEmotionImage = await getImageFromChart(
    "line",
    {
      labels: chartData.labels,
      datasets: [chartData.datasets[2]],
    },
    chartOptions,
    linesCtx
  );

  // Création du graphique de l'emotion happy (courbe)
  let happyEmotionImage = await getImageFromChart(
    "line",
    {
      labels: chartData.labels,
      datasets: [chartData.datasets[3]],
    },
    chartOptions,
    linesCtx
  );

  // Création du graphique de l'emotion disgusted (courbe)
  let disgustedEmotionImage = await getImageFromChart(
    "line",
    {
      labels: chartData.labels,
      datasets: [chartData.datasets[4]],
    },
    chartOptions,
    linesCtx
  );

  // Création du graphique de l'emotion fear (courbe)
  let fearEmotionImage = await getImageFromChart(
    "line",
    {
      labels: chartData.labels,
      datasets: [chartData.datasets[5]],
    },
    chartOptions,
    linesCtx
  );

  let result = getPersonIn(moyenneEmotions);
  let strResult = "";
  if (result) {
    strResult = "On peut garder la personne.";
  } else {
    strResult = "Il ne vaut mieux pas garder la personne.";
  }

  const donnees = {
    Resultat: strResult,
    images: [
      fullEmotionImage,
      moyenneEmotionsImage,
      angryEmotionImage,
      sadEmotionImage,
      surprisedEmotionImage,
      happyEmotionImage,
      disgustedEmotionImage,
      fearEmotionImage,
    ],
  };

  let reponsesFromQuiz = JSON.parse(sessionStorage.getItem("reponses")) || null;
  let noteQuiz = sessionStorage.getItem("note") || -1;

  let pdf = await getPDF(donnees);

  if (reponsesFromQuiz) {
    pdf.addPage();
    pdf.text(20, 20, "Résultat du quiz");
    pdf.setFontSize(12);
    pdf.text(20, 30, "Note : " + noteQuiz + "/20");

    // Insertion du header du tableau
    pdf.setFontSize(10);
    pdf.text(20, 40, "N°");
    pdf.text(30, 40, "Question");
    pdf.text(120, 40, "Réponse");
    pdf.text(160, 40, "Bonne réponse");

    // Insertion des données du tableau
    pdf.setFontSize(8);
    let y = 50;
    let num = 1;
    reponsesFromQuiz.forEach((reponse) => {
      pdf.text(20, y, `${num++}`);
      pdf.text(30, y, reponse.question);
      if (reponse.reponse == reponse.bonneReponse) {
        pdf.setTextColor(0, 255, 0);
      } else {
        pdf.setTextColor(255, 0, 0);
      }
      pdf.text(120, y, reponse.reponse);
      pdf.setTextColor(0, 0, 0);
      pdf.text(160, y, reponse.bonneReponse);
      y += 10;

      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
    });
  }
  let dl_link = document.querySelector("#download-rapport");
  dl_link.style.display = "block";
  dl_link.href = pdf.output("bloburl");
};

/**
 * Decide si nous devons garder ou non la personne
 * @param {Object[]} moyenneEmotions
 * @returns {Boolean}
 */
const getPersonIn = (moyenneEmotions) => {
  const { happy, sad, angry, surprised, disgusted, fear } =
    moyenneEmotions.reduce((acc, emotion) => {
      acc[emotion.Emotion.toLowerCase()] = emotion.Moyenne;
      return acc;
    });

  // Si la personne est triste, en colère, surprise, dégoutée ou apeurée, on ne la garde pas
  if (
    sad > 0.5 ||
    angry > 0.5 ||
    surprised > 0.5 ||
    disgusted > 0.5 ||
    fear > 0.5
  ) {
    return false;
  }

  // Si la personne est heureuse, on la garde
  if (happy > 0.5) {
    return true;
  }

  // Si la personne est neutre, on la garde
  if (happy < 0.5 && sad < 0.5 && angry < 0.5) {
    return true;
  }
};

///////////////////////////////////////////////////////////////////////////////////////

let ctracker = new clm.tracker();
pModel.shapeModel.nonRegularizedVectors.push(9);
pModel.shapeModel.nonRegularizedVectors.push(11);
ctracker.init(pModel);
let ec = new emotionClassifier();
ec.init(emotionModel);
let emotionData = ec.getBlank();

let media_recorder = null;
let blobs_recorded = [];

const main = async () => {
  await setupCamera();

  const startButton = document.querySelector("#startbutton");
  startButton.addEventListener("click", () => {
    media_recorder = new MediaRecorder(camera_stream, {
      mimeType: "video/webm",
    });
    media_recorder.addEventListener("dataavailable", function (e) {
      blobs_recorded.push(e.data);
    });
    media_recorder.addEventListener("stop", function () {
      let video_local = URL.createObjectURL(
        new Blob(blobs_recorded, { type: "video/webm" })
      );
      download_link.style.display = "block";
      download_link.href = video_local;
    });
    media_recorder.start(1000);

    document.querySelector(".containerQuiz").style.display = "flex";

    ctracker.start(video);
    canvas.style.display = "none";
    drawLoop();
  });

  const stopButton = document.querySelector("#stopbutton");
  stopButton.addEventListener("click", async () => {
    document.querySelector(".containerQuiz").style.display = "none";
    media_recorder.stop();
    ctracker.stop();
    ctracker.reset();
    window.cancelAnimationFrame(id_annimation);
    await saveFile(JSON.stringify(datas_emotions));
  });
};

/////////////////////////////////

main();
