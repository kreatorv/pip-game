const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const dialogue = document.getElementById("dialogue");
const dialogueText = document.getElementById("dialogue-text");
const choicesElement = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const scoreElement = document.getElementById("score");
const gameover = document.getElementById("gameover");

// Pip's position
let pipX = 400;
let pipY = 300;
const speed = 3;

let nearestObservable = null;
const observationRange = 50;

// Game state
let score = 0;
let maxScore = 0;
let currentDialogueObject = null;
let feedbackTimer = null;

// Cap animation state (triggered on perfect score)
let capShown = false;
let capProgress = 0;

// Return-to-start animation state (runs after the cap has fully landed)
let returning = false;
let returnStartX = 0;
let returnStartY = 0;
let returnProgress = 0;

const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key.startsWith("Arrow")) e.preventDefault();

  if (e.key === "1" || e.key === "2" || e.key === "3") {
    selectChoice(parseInt(e.key) - 1);
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

const world = [
  {
    type: "park",
    x: 0, y: 380, width: 800, height: 220,
    background: true,
    observation: "An intentional patch of wilderness inside a city grid. Humans need to remember what trees feel like. I understand.",
  },
  {
    type: "building",
    x: 60, y: 30, width: 180, height: 140,
    color: "#b87a5b",
    observation: "A residential building. Humans stack their homes vertically and call this 'a building.' I approve of the space efficiency.",
    choices: [
      { text: "Wave to anyone who might be watching from a window", points: 100 },
      { text: "Test which windows might be breakable", points: -50 },
      { text: "Rewind time and watch every tenant move in, one by one", points: 0 },
    ],
  },
  {
    type: "building",
    x: 310, y: 30, width: 180, height: 140,
    color: "#a06344",
    observation: "Warm light behind the windows. Humans find comfort in visible signs of other humans nearby, even strangers they will never meet.",
    choices: [
      { text: "Calculate the total electrical cost of all that light", points: 0 },
      { text: "Smile at the feeling of occupied homes", points: 100 },
      { text: "Cut the power to see how humans react", points: -50 },
    ],
  },
  {
    type: "building",
    x: 560, y: 30, width: 180, height: 140,
    color: "#8b5a3c",
    observation: "The facade is monotonous. This structure was optimized for cost, not beauty. Humans do this often, then complain about it.",
    choices: [
      { text: "Spray paint a critique on the facade", points: -50 },
      { text: "Travel back in time and convince the original architect to try harder", points: 0 },
      { text: "Accept that not every building can be beautiful", points: 100 },
    ],
  },
  {
    type: "streetlamp",
    x: 275, y: 205,
    observation: "Another artificial sun. The city has strung them at regular intervals, stitching the night back together. A form of applied hope.",
    choices: [
      { text: "Catch a single photon mid-flight and hold it still for study", points: 0 },
      { text: "Throw rocks to \"test the glass\"", points: -50 },
      { text: "Feel the small comfort and walk on", points: 100 },
    ],
  },
  {
    type: "streetlamp",
    x: 525, y: 205,
    observation: "A streetlamp. It illuminates a small circle, yet the whole street feels safer because of it. The mathematics of comfort are unusual.",
    choices: [
      { text: "Unscrew the bulb while no one is looking", points: -50 },
      { text: "Accept that irrational comfort is still real comfort", points: 100 },
      { text: "Try to replicate its glow with your antennae", points: 0 },
    ],
  },
  {
    type: "mail",
    x: 680, y: 195,
    observation: "A letter from a mother to her adult son. Each sentence is factually neutral — 'Rachel always calls on Sundays. I froze the pot roast. Don't worry about me.' Stacked together, they transmit something heavier. I believe humans call this 'guilt,' but I cannot find where in the grammar it hides.",
    choices: [
      { text: "Respond to the mother and tell her to eat the pot roast herself", points: 0 },
      { text: "Recognize this as proof that love and hurt can coexist and sometimes humans struggle to say what they mean", points: 100 },
      { text: "Post a photo of it online and tag the entire family", points: -50 },
    ],
  },
  {
    type: "bench",
    x: 100, y: 470, width: 60, height: 12,
    observation: "A bench. I have no need to rest, yet I find I want to sit on it. This is new.",
    choices: [
      { text: "Sit for a moment, despite not needing rest", points: 100 },
      { text: "Carve your name into it with an antenna", points: -50 },
      { text: "Measure its load-bearing tolerance", points: 0 },
    ],
  },
  {
    type: "trashcan",
    x: 210, y: 455,
    observation: "A medical bill, a teddy bear, and a half-eaten croissant, in the same receptacle. Three things a human kept until they could not. I suspect this is a short story I am not yet equipped to read.",
    choices: [
      { text: "Report the unpaid medical bill to the credit bureau", points: -50 },
      { text: "Feel sorry for the child who lost its teddy and walk on", points: 100 },
      { text: "Eat the croissant and then complain about American pastries", points: 0 },
    ],
  },
  {
    type: "soccerball",
    x: 290, y: 540,
    observation: "A sphere designed for kicking. Humans built an entire planetary culture around chasing this object. I understand none of it, and I am charmed.",
    choices: [
      { text: "Take it home to study its geometry", points: 0 },
      { text: "Pop it to see what's inside", points: -50 },
      { text: "Nudge it toward where a child might find it", points: 100 },
    ],
  },
  {
    type: "streetlamp",
    x: 420, y: 485,
    observation: "An artificial sun, at small scale. Humans fear the dark they evolved in. I find this moving.",
    choices: [
      { text: "Sit under it and watch the moths arrive", points: 100 },
      { text: "Catch the moths and squash them for efficiency", points: -50 },
      { text: "Become a moth, briefly, to understand the attraction", points: 0 },
    ],
  },
  {
    type: "flowers",
    x: 490, y: 540,
    observation: "Flowers in bloom. Plants evolved these to attract insects, and humans adopted them as symbols of love. This accident of shared aesthetics seems important.",
    choices: [
      { text: "Uproot them to analyze the soil chemistry", points: -50 },
      { text: "Pick one to press between pages", points: 0 },
      { text: "Stop and admire them for a while", points: 100 },
    ],
  },
  {
    type: "pigeon",
    x: 620, y: 545,
    observation: "A pigeon. I have 14,000 pages of information about this species, yet I cannot tell what this specific one is thinking. It is scrutinizing me.",
    choices: [
      { text: "Grab it to examine its feather structure", points: -50 },
      { text: "Nod politely and let it go about its day", points: 100 },
      { text: "Engage it in debate about pigeon consciousness", points: 0 },
    ],
  },
  {
    type: "bench",
    x: 650, y: 470, width: 60, height: 12,
    observation: "Another bench, identical to the other one. Yet I sense humans would prefer one over the other, for reasons they cannot articulate.",
    choices: [
      { text: "Survey passersby about bench preferences", points: 0 },
      { text: "Remove the other bench to simplify the decision", points: -50 },
      { text: "Sit on this one anyway and see how it feels", points: 100 },
    ],
  },
  {
    type: "newspaper",
    x: 400, y: 200,
    observation: "Today's headline: \"MINNESOTA NAMED BEST PLACE TO GROW UP IN AMERICA.\" A committee of analysts has ranked the geography of childhood. The variables: lakes, schools, winter, and a quality they call \"niceness.\" I have data on the first three. The fourth appears to carry most of the weight.",
    choices: [
      { text: "Find a Minnesotan and become friends for life", points: 100 },
      { text: "Cross-reference this against 46 other rankings and publish a meta-analysis", points: 0 },
      { text: "Correct the headline with a red marker — no state can be empirically \"best\"", points: -50 },
    ],
  },
  {
    type: "hydrant",
    x: 720, y: 410,
    observation: "A fire hydrant. Pressurized water access for firefighters, and, by unanimous dog consensus, a public bulletin board. Infrastructure that acquired a second purpose without anyone approving it.",
    choices: [
      { text: "Give the hydrant a respectful salute", points: 100 },
      { text: "Mark the hydrant. It is yours now", points: -50 },
      { text: "Massage the hydrant to release all the pressure before it has a panic attack", points: 0 },
    ],
  },
];

// Fisher-Yates shuffle — returns a shuffled copy of an array without touching the original.
function shuffled(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// Randomize each object's choice order once at startup, so the correct
// answer can appear in any slot (and a different slot every page load).
for (const obj of world) {
  if (obj.choices) obj.choices = shuffled(obj.choices);
}

// Compute max possible score from the world data at startup.
for (const obj of world) {
  if (obj.choices) maxScore += 100;
}

function drawPip(x, y) {
  ctx.fillStyle = "#f5c842";
  ctx.fillRect(x - 16, y - 3, 32, 16);

  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(x - 13, y - 5, 26, 20);

  ctx.fillStyle = "#6b4423";
  ctx.fillRect(x - 9, y - 5, 3, 20);
  ctx.fillRect(x + 6, y - 5, 3, 20);

  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(x - 9, y + 15, 6, 10);
  ctx.fillRect(x + 3, y + 15, 6, 10);

  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x - 8, y + 20, 4, 3);

  ctx.fillStyle = "#f5f1e8";
  ctx.beginPath();
  ctx.ellipse(x, y - 16, 17, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1e3a5f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 20);
  ctx.lineTo(x - 3, y - 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 3, y - 22);
  ctx.lineTo(x + 10, y - 20);
  ctx.stroke();

  ctx.fillStyle = "#1e3a5f";
  ctx.beginPath();
  ctx.arc(x - 6, y - 16, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 6, y - 16, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 5, y - 17, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 7, y - 17, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1e3a5f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 10, 3, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "#1e3a5f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 36);
  ctx.lineTo(x - 3, y - 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 5, y - 36);
  ctx.lineTo(x + 3, y - 28);
  ctx.stroke();

  ctx.fillStyle = "#1e3a5f";
  ctx.beginPath();
  ctx.arc(x - 5, y - 37, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 5, y - 37, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPark(p) {
  ctx.fillStyle = "#4a7c59";
  ctx.fillRect(p.x, p.y, p.width, p.height);
  ctx.fillStyle = "#8b8b92";
  ctx.fillRect(p.x, p.y, p.width, 8);
}

function drawBuilding(b) {
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.width, b.height);
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(b.x, b.y, b.width, 8);
  ctx.fillStyle = "#e8d77a";
  ctx.fillRect(b.x + 20, b.y + 25, 24, 28);
  ctx.fillRect(b.x + 78, b.y + 25, 24, 28);
  ctx.fillRect(b.x + 136, b.y + 25, 24, 28);
  ctx.fillRect(b.x + 20, b.y + 70, 24, 28);
  ctx.fillRect(b.x + 78, b.y + 70, 24, 28);
  ctx.fillRect(b.x + 136, b.y + 70, 24, 28);
  ctx.fillStyle = "#3a1a0a";
  ctx.fillRect(b.x + b.width / 2 - 14, b.y + b.height - 32, 28, 32);
}

function drawBench(b) {
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(b.x, b.y, b.width, 10);
  ctx.fillRect(b.x, b.y - 6, b.width, 4);
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(b.x + 4, b.y + 10, 4, 10);
  ctx.fillRect(b.x + b.width - 8, b.y + 10, 4, 10);
}

function drawStreetlamp(l) {
  ctx.fillStyle = "#2a2a32";
  ctx.fillRect(l.x - 2, l.y - 50, 4, 50);
  ctx.fillRect(l.x - 6, l.y, 12, 4);
  ctx.fillStyle = "#f5e680";
  ctx.beginPath();
  ctx.arc(l.x, l.y - 54, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(245, 230, 128, 0.2)";
  ctx.beginPath();
  ctx.arc(l.x, l.y - 54, 16, 0, Math.PI * 2);
  ctx.fill();
}

function drawPigeon(p) {
  ctx.fillStyle = "#7a7a82";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(p.x - 12, p.y - 2);
  ctx.lineTo(p.x - 20, p.y - 6);
  ctx.lineTo(p.x - 20, p.y + 6);
  ctx.fill();
  ctx.fillStyle = "#6a6a72";
  ctx.beginPath();
  ctx.arc(p.x + 11, p.y - 5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d4a84a";
  ctx.beginPath();
  ctx.moveTo(p.x + 16, p.y - 5);
  ctx.lineTo(p.x + 22, p.y - 3);
  ctx.lineTo(p.x + 16, p.y - 1);
  ctx.fill();
  ctx.fillStyle = "#1e1e22";
  ctx.beginPath();
  ctx.arc(p.x + 13, p.y - 7, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d4a84a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x - 3, p.y + 9);
  ctx.lineTo(p.x - 3, p.y + 13);
  ctx.moveTo(p.x + 3, p.y + 9);
  ctx.lineTo(p.x + 3, p.y + 13);
  ctx.stroke();
}

function drawSoccerball(s) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(s.x, s.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.x - 5, s.y + 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.x + 5, s.y + 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a0a0a0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFlowers(f) {
  ctx.fillStyle = "#3a6645";
  ctx.fillRect(f.x - 22, f.y - 10, 44, 20);

  const flowers = [
    { dx: -15, dy: -4, color: "#e85d75" },
    { dx:  -7, dy:  3, color: "#f5c842" },
    { dx:   2, dy: -5, color: "#c77bb8" },
    { dx:  10, dy:  4, color: "#ffffff" },
    { dx:  17, dy: -3, color: "#f08b4a" },
    { dx:  -4, dy:  6, color: "#e85d75" },
  ];

  for (const flower of flowers) {
    ctx.fillStyle = flower.color;
    ctx.beginPath();
    ctx.arc(f.x + flower.dx, f.y + flower.dy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrashcan(t) {
  ctx.fillStyle = "#3a4a3a";
  ctx.fillRect(t.x - 14, t.y - 25, 28, 30);
  ctx.fillStyle = "#4a5a4a";
  ctx.fillRect(t.x - 16, t.y - 28, 32, 5);
  ctx.strokeStyle = "#2a3a2a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(t.x - 7, t.y - 23);
  ctx.lineTo(t.x - 7, t.y + 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(t.x + 7, t.y - 23);
  ctx.lineTo(t.x + 7, t.y + 3);
  ctx.stroke();

  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(t.x - 13, t.y - 38, 11, 12);
  ctx.fillStyle = "#a03030";
  ctx.fillRect(t.x - 13, t.y - 38, 11, 2.5);
  ctx.strokeStyle = "#a0a0a0";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(t.x - 12, t.y - 33);
  ctx.lineTo(t.x - 4, t.y - 33);
  ctx.moveTo(t.x - 12, t.y - 31);
  ctx.lineTo(t.x - 4, t.y - 31);
  ctx.moveTo(t.x - 12, t.y - 29);
  ctx.lineTo(t.x - 4, t.y - 29);
  ctx.stroke();

  ctx.fillStyle = "#a07a52";
  ctx.beginPath();
  ctx.arc(t.x + 2, t.y - 32, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(t.x - 2, t.y - 36, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(t.x + 6, t.y - 36, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d4a87a";
  ctx.beginPath();
  ctx.arc(t.x + 2.5, t.y - 30, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e1e22";
  ctx.beginPath();
  ctx.arc(t.x, t.y - 32, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(t.x + 4, t.y - 32, 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c9965c";
  ctx.beginPath();
  ctx.arc(t.x + 11, t.y - 32, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5a30";
  ctx.beginPath();
  ctx.arc(t.x + 13, t.y - 34, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHydrant(h) {
  ctx.fillStyle = "#2a2a32";
  ctx.fillRect(h.x - 11, h.y, 22, 4);
  ctx.fillStyle = "#b83030";
  ctx.fillRect(h.x - 9, h.y - 22, 18, 22);
  ctx.fillStyle = "#8a2020";
  ctx.fillRect(h.x - 10, h.y - 26, 20, 4);
  ctx.fillStyle = "#6a6a72";
  ctx.fillRect(h.x - 3, h.y - 29, 6, 3);
  ctx.fillStyle = "#8a8a92";
  ctx.fillRect(h.x - 13, h.y - 16, 4, 6);
  ctx.fillRect(h.x + 9, h.y - 16, 4, 6);
  ctx.fillStyle = "#2a2a32";
  ctx.beginPath();
  ctx.arc(h.x - 11, h.y - 13, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(h.x + 11, h.y - 13, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d84848";
  ctx.fillRect(h.x - 7, h.y - 20, 2, 18);
}

function drawMail(m) {
  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(m.x - 16, m.y - 6, 32, 16);
  ctx.strokeStyle = "#a8a8b0";
  ctx.lineWidth = 1;
  ctx.strokeRect(m.x - 16, m.y - 6, 32, 16);
  ctx.beginPath();
  ctx.moveTo(m.x - 16, m.y - 6);
  ctx.lineTo(m.x, m.y + 3);
  ctx.lineTo(m.x + 16, m.y - 6);
  ctx.stroke();
  ctx.fillStyle = "#c43030";
  ctx.fillRect(m.x + 10, m.y - 4, 5, 5);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(m.x - 10, m.y - 18, 20, 14);
  ctx.strokeStyle = "#a8a8b0";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(m.x - 10, m.y - 18, 20, 14);
  ctx.strokeStyle = "#5a5a62";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(m.x - 8, m.y - 16);
  ctx.lineTo(m.x + 5, m.y - 16);
  ctx.moveTo(m.x - 8, m.y - 14);
  ctx.lineTo(m.x + 7, m.y - 14);
  ctx.moveTo(m.x - 8, m.y - 12);
  ctx.lineTo(m.x + 3, m.y - 12);
  ctx.moveTo(m.x - 8, m.y - 10);
  ctx.lineTo(m.x + 6, m.y - 10);
  ctx.moveTo(m.x - 8, m.y - 8);
  ctx.lineTo(m.x + 2, m.y - 8);
  ctx.stroke();
  ctx.strokeStyle = "#3a3a42";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(m.x + 1, m.y - 5);
  ctx.lineTo(m.x + 3, m.y - 7);
  ctx.lineTo(m.x + 5, m.y - 5);
  ctx.lineTo(m.x + 7, m.y - 7);
  ctx.stroke();
}

function drawNewspaper(n) {
  // Paper base (slightly off-white)
  ctx.fillStyle = "#eae3d0";
  ctx.fillRect(n.x - 18, n.y - 14, 36, 28);
  ctx.strokeStyle = "#a8a098";
  ctx.lineWidth = 1;
  ctx.strokeRect(n.x - 18, n.y - 14, 36, 28);

  // Masthead (newspaper title bar)
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(n.x - 17, n.y - 13, 34, 4);

  // Bold headline bar
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(n.x - 16, n.y - 7, 32, 3);

  // Body text lines
  ctx.strokeStyle = "#6a6a72";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(n.x - 16, n.y - 2 + i * 2.5);
    ctx.lineTo(n.x + 16, n.y - 2 + i * 2.5);
    ctx.stroke();
  }

  // Fold crease down the middle
  ctx.strokeStyle = "#a8a098";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(n.x, n.y - 13);
  ctx.lineTo(n.x, n.y + 13);
  ctx.stroke();
}

function drawObject(obj) {
  if (obj.type === "park") drawPark(obj);
  else if (obj.type === "building") drawBuilding(obj);
  else if (obj.type === "bench") drawBench(obj);
  else if (obj.type === "streetlamp") drawStreetlamp(obj);
  else if (obj.type === "pigeon") drawPigeon(obj);
  else if (obj.type === "soccerball") drawSoccerball(obj);
  else if (obj.type === "flowers") drawFlowers(obj);
  else if (obj.type === "trashcan") drawTrashcan(obj);
  else if (obj.type === "hydrant") drawHydrant(obj);
  else if (obj.type === "mail") drawMail(obj);
  else if (obj.type === "newspaper") drawNewspaper(obj);
}

function distanceFromPip(obj) {
  if (obj.width !== undefined && obj.height !== undefined) {
    const dx = Math.max(obj.x - pipX, 0, pipX - (obj.x + obj.width));
    const dy = Math.max(obj.y - pipY, 0, pipY - (obj.y + obj.height));
    return Math.sqrt(dx * dx + dy * dy);
  }
  const dx = obj.x - pipX;
  const dy = obj.y - pipY;
  return Math.sqrt(dx * dx + dy * dy);
}

function findNearestObservable() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const obj of world) {
    if (obj.background) continue;

    const d = distanceFromPip(obj);
    if (d < observationRange && d < nearestDistance) {
      nearest = obj;
      nearestDistance = d;
    }
  }

  return nearest;
}

function renderChoices(choices) {
  choicesElement.innerHTML = "";
  choices.forEach((choice, i) => {
    const row = document.createElement("div");
    row.className = "choice";

    const number = document.createElement("span");
    number.className = "choice-number";
    number.textContent = (i + 1).toString();

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice.text;

    row.appendChild(number);
    row.appendChild(text);
    row.addEventListener("click", () => selectChoice(i));
    choicesElement.appendChild(row);
  });
}

function updateChoicesDisplay() {
  if (nearestObservable && !nearestObservable.answered && nearestObservable.choices) {
    renderChoices(nearestObservable.choices);
    choicesElement.classList.remove("hidden");
  } else {
    choicesElement.innerHTML = "";
    choicesElement.classList.add("hidden");
  }
}

function updateDialogue() {
  if (nearestObservable !== currentDialogueObject) {
    currentDialogueObject = nearestObservable;

    if (nearestObservable) {
      dialogueText.textContent = nearestObservable.observation;
      updateChoicesDisplay();
      dialogue.classList.remove("hidden");
    } else {
      dialogue.classList.add("hidden");
      choicesElement.classList.add("hidden");
    }
  }
}

function selectChoice(index) {
  if (!nearestObservable) return;
  if (nearestObservable.answered) return;
  if (!nearestObservable.choices) return;
  if (index < 0 || index >= nearestObservable.choices.length) return;

  const choice = nearestObservable.choices[index];
  score += choice.points;
  nearestObservable.answered = true;

  showFeedback(choice.points);
  updateScoreDisplay();
  updateChoicesDisplay();

  if (score === maxScore && !capShown) {
    capShown = true;
  }

  // If every observable has been answered but the score is not perfect, lose.
  // Delay briefly so the player sees their final feedback popup before the overlay.
  if (allAnswered() && score < maxScore) {
    setTimeout(showGameOver, 1500);
  }
}

function allAnswered() {
  for (const obj of world) {
    if (obj.choices && !obj.answered) return false;
  }
  return true;
}

function showGameOver() {
  gameover.classList.remove("hidden");
}

function showFeedback(points) {
  const text = points > 0 ? `+${points}` : points.toString();
  feedback.textContent = text;

  feedback.classList.remove("positive", "neutral", "negative");
  if (points > 0) feedback.classList.add("positive");
  else if (points < 0) feedback.classList.add("negative");
  else feedback.classList.add("neutral");

  feedback.classList.remove("hidden");

  if (feedbackTimer !== null) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    feedback.classList.add("hidden");
    feedbackTimer = null;
  }, 1400);
}

function updateScoreDisplay() {
  scoreElement.textContent = `${score} / ${maxScore}`;
  scoreElement.classList.add("just-updated");
  setTimeout(() => scoreElement.classList.remove("just-updated"), 400);
}

function update() {
  // Arrow-key input is disabled once the return-home animation begins.
  if (!returning) {
    if (keys["ArrowUp"]) pipY -= speed;
    if (keys["ArrowDown"]) pipY += speed;
    if (keys["ArrowLeft"]) pipX -= speed;
    if (keys["ArrowRight"]) pipX += speed;

    if (pipX < 20) pipX = 20;
    if (pipX > canvas.width - 20) pipX = canvas.width - 20;
    if (pipY < 40) pipY = 40;
    if (pipY > canvas.height - 30) pipY = canvas.height - 30;
  }

  nearestObservable = returning ? null : findNearestObservable();
  updateDialogue();

  // Advance the cap's descent animation toward 1 once triggered.
  if (capShown && capProgress < 1) {
    capProgress = Math.min(1, capProgress + 0.012);
  }

  // Once the cap has fully landed, snapshot Pip's position and begin the slide home.
  if (capShown && capProgress >= 1 && !returning && (pipX !== 400 || pipY !== 300)) {
    returning = true;
    returnStartX = pipX;
    returnStartY = pipY;
    returnProgress = 0;
  }

  // Smoothly interpolate Pip from where he stood to the starting spot (400, 300).
  if (returning && returnProgress < 1) {
    returnProgress = Math.min(1, returnProgress + 0.008);
    const eased = 1 - Math.pow(1 - returnProgress, 3);
    pipX = returnStartX + (400 - returnStartX) * eased;
    pipY = returnStartY + (300 - returnStartY) * eased;
  }
}

function drawHighlight(obj) {
  ctx.strokeStyle = "#ffe680";
  ctx.lineWidth = 2;

  if (obj.width !== undefined && obj.height !== undefined) {
    ctx.strokeRect(obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8);
  } else {
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCap() {
  if (!capShown) return;

  // Target resting position: brim just touching the top of Pip's head.
  const targetY = pipY - 52;

  // During descent, interpolate from high above the canvas down to the target,
  // using an ease-out curve so the cap slows as it settles.
  let cy;
  if (capProgress >= 1) {
    cy = targetY;
  } else {
    const startY = -80;
    const eased = 1 - Math.pow(1 - capProgress, 3);
    cy = startY + (targetY - startY) * eased;
  }
  const cx = pipX;

  // Brim (flatter ellipse, mostly in front of the crown)
  ctx.fillStyle = "#8a2828";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 54, 8, 0, 0, Math.PI);
  ctx.fill();

  // Crown (red dome)
  ctx.fillStyle = "#c24646";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 48, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Band at the base of the crown
  ctx.fillStyle = "#8a2828";
  ctx.fillRect(cx - 48, cy + 11, 96, 4);

  // "Honorary Human" label on the front
  ctx.fillStyle = "#f5c842";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Honorary Human", cx, cy + 1);

  // Small button on top
  ctx.fillStyle = "#8a2020";
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 2, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.fillStyle = "#8b8b92";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#3a3a42";
  ctx.fillRect(0, 210, canvas.width, 170);

  ctx.fillStyle = "#e8c030";
  for (let dashX = 20; dashX < canvas.width; dashX += 40) {
    ctx.fillRect(dashX, 293, 22, 4);
  }

  for (const obj of world) {
    drawObject(obj);
  }

  if (nearestObservable) drawHighlight(nearestObservable);

  drawPip(pipX, pipY);
  drawCap();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

updateScoreDisplay();
loop();
