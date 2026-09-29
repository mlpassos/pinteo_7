var turtle = null;
var logo = null;
var canvas;
var form;
var sprite;
var textOutput;
var oldcode;
var fast;
var out;
var DelayTurtle;

function setup() {
    logo = new Logo();
    
    fast = 5;
    turtle = new DelayTurtle(canvas, sprite, fast, false);
    logo.setTurtle(turtle);
    logo.setTextOutput(textOutput);
}

function init(canvas_id, turtle_id, form_id, oldcode_id, textoutput_id) {
    canvas = document.getElementById(canvas_id);
    form = document.getElementById(form_id);
    textOutput = document.getElementById(textoutput_id);
    sprite = document.getElementById(turtle_id);

    // I hate opera, I hate firefox.
    canvas.style.width = 500;
    canvas.width = 500;
    
    canvas.style.height = 500;
    canvas.height = 500;
    
    oldcode = document.getElementById(oldcode_id);
   
    // $teste[0].scrollTop = $teste[0].scrollHeight;
    setup();
}

function run(speed, drawbits) {
    turtle.stop();
     // alert('oi');
    if (speed !== fast) {
        fast = speed;
        var newturtle = null;
        // newturtle = new Turtle(canvas);
        newturtle = new DelayTurtle(canvas, sprite, fast, drawbits);
        logo.setTurtle(newturtle);
        turtle = newturtle;
        
    }
    //alert('oi');
    oldcode.innerHTML += "\n" + cm.getValue();
    // added by Márcio Passos
    memoria = $('#oldcode');
    memoria.animate({'scrollTop': memoria.get(0).scrollHeight}, 3000);
    //form.code.value = ""
   
    //out = logo.run(form.code.value);
    out = logo.run(cm.getValue());

    
    if (out && out.type === "error") {
        // $("<p>Erro: "+out.data+"</p>").dialog();
        $("<p>"+out.data+"</p>").dialog({
              autoOpen: true,
              dialogClass: "ui-state-error",
              title: 'Erro',
              closeText: 'Fechar',
              buttons: [ { 
                text: "Fechar", 
                click: function() {
                    $(this).dialog("close");
                }
              }],
              modal: false,
              show: {
                effect: "shake",
                
                duration: 600
                },
              hide: {
                effect: "explode",
                pieces: 16,
                duration: 600
                }
        }).prev().addClass('ui-state-error');
        setup();
        return "error";
    } else {
        return "running";
    }
}

function stop() {

    if (out && out.type === "error") {
        // não faz nada caso tenha dado erro na execução do código
    } else {
        turtle.stop();
        turtle.reset();
    }
}

function clearcanvas() {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(0, 0, 500, 500);
    textOutput.innerHTML = "";
}
