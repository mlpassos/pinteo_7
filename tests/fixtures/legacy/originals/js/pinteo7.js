/*
// Métodos para integração com Moodle via iTarefa
var answer = '';
var evaluation = '';
function getAnswer() {
	if (answer!=='') {
		return answer;
	} else {
		return -1;
	}
}
function getEvaluation() {
	// setar 1 caso seja aluno respondendo (exercicio)
	// setar 0 se não for exercício (resposta?)
	return 1;
}

function urldecode(str) {
  //       discuss at: http://phpjs.org/functions/urldecode/
  //      original by: Philip Peterson
  //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //      improved by: Brett Zamir (http://brett-zamir.me)
  //      improved by: Lars Fischer
  //      improved by: Orlando
  //      improved by: Brett Zamir (http://brett-zamir.me)
  //      improved by: Brett Zamir (http://brett-zamir.me)
  //         input by: AJ
  //         input by: travc
  //         input by: Brett Zamir (http://brett-zamir.me)
  //         input by: Ratheous
  //         input by: e-mike
  //         input by: lovio
  //      bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //      bugfixed by: Rob
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  //             note: info on what encoding functions to use from: http://xkr.us/articles/javascript/encode-compare/
  //             note: Please be aware that this function expects to decode from UTF-8 encoded strings, as found on
  //             note: pages served as UTF-8
  //        example 1: urldecode('Kevin+van+Zonneveld%21');
  //        returns 1: 'Kevin van Zonneveld!'
  //        example 2: urldecode('http%3A%2F%2Fkevin.vanzonneveld.net%2F');
  //        returns 2: 'http://kevin.vanzonneveld.net/'
  //        example 3: urldecode('http%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3Dphp.js%26ie%3Dutf-8%26oe%3Dutf-8%26aq%3Dt%26rls%3Dcom.ubuntu%3Aen-US%3Aunofficial%26client%3Dfirefox-a');
  //        returns 3: 'http://www.google.nl/search?q=php.js&ie=utf-8&oe=utf-8&aq=t&rls=com.ubuntu:en-US:unofficial&client=firefox-a'
  //        example 4: urldecode('%E5%A5%BD%3_4');
  //        returns 4: '\u597d%3_4'

  return decodeURIComponent((str + '')
    .replace(/%(?![\da-f]{2})/gi, function() {
      // PHP tolerates poorly formed escape sequences
      return '%25';
    })
    .replace(/\+/g, '%20'));
}

var vars = [], hash;
var q = document.URL.split('?')[1];

if(q != undefined){
    //alert('parametros: ' + q);
    q = q.split('&');
    for(var i = 0; i < q.length; i++){
        hash = q[i].split('=');
        //alert(hash[0]+'='+hash[1]);
        vars.push(hash[1]);
        vars[hash[0]] = hash[1];
    }
}
*/

// INICIALIZA JQUERY APÓS O CARREGAMENTO DO DOCUMENTO
$(document).ready(function(){

	init('canvas','turtle','input','oldcode', 'textOutput'); clearcanvas();

    if (typeof CodeMirror !== 'undefined') {

        //alert('oi');
        var BRACKETS = '()[]{}';

        cm = CodeMirror.fromTextArea(document.getElementById("code"), {
          autoCloseBrackets: { pairs: BRACKETS, explode: BRACKETS },
          matchBrackets: true,
          lineComment: ';',
          lineNumbers: true,
          mode: 'logo'
        });
        // $('#code + .CodeMirror').id = 'logo-cm-multi-line';
        // cm.setSize('100%', '100%');
        // CodeMirror.runMode(text, 'logo', '#code');
    } else {
        alert('sem codemirror');
    }

	var audiotypes={
        "mp3": "audio/mpeg",
        "mp4": "audio/mp4",
        "ogg": "audio/ogg",
        "wav": "audio/wav"
    }
    // Esperar 1 segundo e ativar blocos
    // setTimeout(function(){
    //     $("#oldcode").stop(true,true).slideToggle('slow');
    //     $("#code").stop(true,true).slideToggle('slow');
    //     $('#codeblocks').stop(true,true).slideToggle('slow');    
    // },1000);
    
    // TODO: Implementar mesmos métodos de $applet_ilm e view.php (filter)
    /*
    
    switch(vars['MA_PARAM_Type']) {
        case "view":
            alert('view');
            // Retirar botão Responder/Gravar
            $("#responder").remove();
            break;
        case "preview":
            alert('preview');
            // Retirar botão Responder/Gravar
            $("#responder").remove();
            // Carrega arquivo da atividade interativa no Pinte o 7
            var file = urldecode(vars['MA_PARAM_Proposition']);
            var jqxhr = $.get( file, function(response) {
                    //alert( response );
                    var resposta = urldecode(response);
                    //alert(resposta);
                    $('#codeblocks').html(resposta);
                }).done(function() {
                    //alert( "fim" );
                }).fail(function() {
                    alert( "Ooops, encontrei uma pedra no meio do caminho. Por favor, tente novamente." );
                }).always(function() {
                    //alert( "finished" );
                });
            break;
        case "activity":
            alert('activity');
            // caso não exista resposta do aluno para questão ainda
            if (vars['MA_PARAM_Respondido']==0) {
                // verifica o tipo de atividade: sendo exemplo, carrega o arquivo do atividade interativa
                if (vars['MA_PARAM_ActivityType']==1) {
                    // Retirar botão Responder/Gravar
                    $("#responder").remove();
                    // Carregar arquivo
                    var file = urldecode(vars['MA_PARAM_Proposition']);
                    //file = file.replace('localhost','177.194.149.215');
                    //alert('Arquivo resposta:\n' + file);
                    var jqxhr = $.get( file, function(response) {
                        //alert( response );
                        var resposta = urldecode(response);
                        //alert(resposta);
                        $('#codeblocks').html(resposta);
                    }).done(function() {
                        //alert( "fim" );
                    }).fail(function() {
                        alert( "Ooops, encontrei uma pedra no meio do caminho. Por favor, tente novamente." );
                    }).always(function() {
                        //alert( "finished" );
                    });
                } else {
                    // se não for exemplo, é exercício ou teste então não mostra resposta pois ainda não existe (MA_PARAM_RESPONDIDO=0)
                    alert('Sem resposta para mostrar.');
                    // já que não existe resposta, o botão é o Gravar
                    var btnResposta = 'Gravar';
                    $("#responder > span").text(btnResposta);
                }
            } else {
                // Caso MA_PARAM_Respondido=1, já existe resposta enviada pelo aluno
                // Exibe resposta enviada previamente
                // 
                // Retirar botão Responder/Gravar
                $("#responder").remove();
                // // Carrega arquivo da atividade interativa no Pinte o 7
                var file = urldecode(vars['MA_PARAM_Proposition']);
                //file = file.replace('localhost','177.194.149.215');
                //alert('Arquivo resposta:\n' + file);
                var jqxhr = $.get( file, function(response) {
                    //alert( response );
                    var resposta = urldecode(response);
                    //alert(resposta);
                    $('#codeblocks').html(resposta);
                }).done(function() {
                    //alert( "fim" );
                }).fail(function() {
                    alert( "Ooops, encontrei uma pedra no meio do caminho. Por favor, tente novamente." );
                }).always(function() {
                    //alert( "finished" );
                });
            }
            break;
        case "editor_new":
            alert('editor_new');
            var btnResposta = 'Gravar';
            $('<p>Ao finalizar a questão, você deve clicar em Gravar para configurar como Solução Final.</p>').dialog({
                autoOpen: true,
                title: 'Aviso',
                closeText: 'Fechar',
                buttons: [ { 
                   text: "Fechar", 
                   click: function() {
                       $(this).dialog("close");
                   }
                }],
                modal: false,
                show: {
                    effect: "drop",
                    direction: 'up',
                    duration: 600
                },
                hide: {
                    effect: "drop",
                    direction: 'up',
                    duration: 600
                }
            });
            $("#responder > span").text(btnResposta);
            break;    
        case "editor_update":
            alert('editor_update');
            // Ajusta texto do botão de resposta
            var btnResposta = 'Atualizar';
            $("#responder > span").text(btnResposta);
            // // Carrega arquivo da atividade interativa no Pinte o 7
            var file = urldecode(vars['MA_PARAM_Proposition']);
                //file = file.replace('localhost','177.194.149.215');
                //alert('Arquivo resposta:\n' + file);
                var jqxhr = $.get( file, function(response) {
                    //alert( response );
                    var resposta = urldecode(response);
                    //alert(resposta);
                    $('#codeblocks').html(resposta);
                }).done(function() {
                    //alert( "fim" );
                }).fail(function() {
                    alert( "Ooops, encontrei uma pedra no meio do caminho. Por favor, tente novamente." );
                }).always(function() {
                    //alert( "finished" );
                });
            break;
        default:
            //alert('opa, sem parâmetro de chamada do iMA (MA_PARAM_Type');
            break;
    }
    
    $("#responder").click(function(){
    	answerbox = $('#codeblocks');
        //answer = answerbox.html();
        if ((answerbox.text().trim()=="Crie os blocos clicando nos botões do menu acima.") || (answerbox.text().trim()=="")) {
            alert('Atividade vazia.')
        } else {
            answer = answerbox.html();
            alert('Atividade pronta para gravação.\nCaso a modifique, é necessário clicar em ' + btnResposta + ' novamente');
        }
    });
    
    */

    function ss_soundbits(sound){
        var audio_element = document.createElement('audio')
        if (audio_element.canPlayType){
            for (var i=0; i<arguments.length; i++){
                var source_element = document.createElement('source')
                source_element.setAttribute('src', arguments[i])
                if (arguments[i].match(/\.(\w+)$/i))
                    source_element.setAttribute('type', audiotypes[RegExp.$1])
                audio_element.appendChild(source_element)
            }
            audio_element.load()
            audio_element.playclip=function(){
                audio_element.pause()
                audio_element.currentTime=0
                audio_element.play()
            }
            return audio_element
        }
    }

    var clicksound  = ss_soundbits('sounds/click.ogg', "sounds/click.mp3");
    var deletesound  = ss_soundbits('sounds/delete.ogg', "sounds/delete.mp3");

	// MOVIMENTO
	var valor_forward=$("#valor_forward");
	var valor_backward=$("#valor_backward");
	var valor_color=$("#valor_color");
	var valor_left=$("#valor_left");
	var valor_right=$("#valor_right");
	var valor_setx=$("#valor_setx");
	var valor_sety=$("#valor_sety");
	var valor_setxy=$("#valor_setxy");
	
	// CONTROLE
	var valor_repeat=$("#valor_repeat");
	var valor_to=$("#valor_to");
	var valor_call=$("#valor_call");

	// DADOS
	var valor_make=$("#valor_make");
	var valor_callvar=$("#valor_callvar");

    var valor_sum = $('#valor_sum');
    var valor_divide = $('#valor_divide');
    var valor_difference = $('#valor_difference');
    var valor_product = $('#valor_product');

	
	// OBJETO COM ELEMENTO, TEXTO PRA USAR NO COMANDO e etc...
	comandos = {
			'forward':{
				'element':valor_forward,
				'text':'para frente',
				'command': 'forward'
			},
			'backward':{
				'element':valor_backward,
				'text':'para trás',
				'command': 'backward'
			},
			'call': {
				'element':valor_call,
				'text':'call',
				'command': 'call'
			},
			'callvar': {
				'element':valor_callvar,
				'text':'callvar',
				'command': 'callvar'
			},
			'color':{
				'element':valor_color,
				'text':'color',
				'command': 'color'
			},
			'left':{
				'element':valor_left,
				'text':'girar à esquerda',
				'command': 'left'
			},
			'make':{
				'element':valor_make,
				'text':'make',
				'command': 'make'
			},
			'right':{
				'element':valor_right,
				'text':'girar à direita',
				'command': 'right'
			},
			'reset':{
				'element':'',
				'text':'limpar',
				'command': 'reset'
			},
			'repeat':{
				'element':valor_repeat,
				'text':'repetir',
				'command': 'repeat'
			},
			'penup':{
				'element':'',
				'text':'parar de escrever',
				'command': 'penup'
			},
			'pendown':{
				'element':'',
				'text':'escrever',
				'command': 'pendown'
			},
			'setx':{
				'element':valor_setx,
				'text':'ir para x',
				'command': 'setx'
			},
			'sety':{
				'element':valor_sety,
				'text':'ir para y',
				'command': 'sety' 
			},
			'setxy':{
				'element':valor_setxy,
				'text':'ir para x y',
				'command': 'setxy' 
			},
			'to':{
				'element':valor_to,
				'text':'ação',
				'command': 'to' 
			},
            'sum':{
                'element':valor_sum,
                'text':'somar',
                'command': 'sum' 
            },
            'divide':{
                'element':valor_divide,
                'text':'dividir',
                'command': 'divide' 
            },
            'difference':{
                'element':valor_difference,
                'text':'diminuir',
                'command': 'difference' 
            },
            'product':{
                'element':valor_product,
                'text':'multiplicar',
                'command': 'product' 
            }
		};

	// CRIA CAIXA DE AJUDA E DICAS
	$( "body" ).delegate( "a,input,.list-prog", "myCustomEvent2", function( e, myName, myValue ) {
		$('a:not(.menu-link),input:not(.valor),.list-prog').tooltip({
	        position: {
	        my: "center bottom-20",
	        at: "center top",
	        using: function( position, feedback ) {
	          $( this ).css( position );
	          $( "<div>" )
	            .addClass( "arrow" )
	            .addClass( feedback.vertical )
	            .addClass( feedback.horizontal )
	            .appendTo( this );
	        }
	    }});
	});
	$( "body" ).delegate( ".codeblocks-list-item,.codeblocks-list-trash,.codeblocks-list-play", "ativarDicasBlocos", function( e, myName, myValue ) {
		$('.codeblocks-list-item,.codeblocks-list-trash,.codeblocks-list-play').tooltip({
	        position: {
	        my: "center bottom-20",
	        at: "center top",
	        using: function( position, feedback ) {
	          $( this ).css( position );
	          $( "<div>" )
	            .addClass( "arrow" )
	            .addClass( feedback.vertical )
	            .addClass( feedback.horizontal )
	            .appendTo( this );
	        }
	    }});
	});
	// RETIRAR DEPOIS POIS JÁ CARREGA NO WELCOME
	$( "a:not(a.reset),input,.list-prog" ).trigger( "myCustomEvent2" );

	$(".fancyimages").fancybox({
    	'transitionIn'	:	'elastic',
		'transitionOut'	:	'elastic',

		'speedIn'		:	600, 
		'speedOut'		:	200, 
		'overlayShow'	:	false}
	);
    
 	// CARREGA COMPARTILHADOS   
    $.ajax({
		url: "listar.php",
        dataType: 'json',
		success: function(data,callback){
            $.each(data[0], function(i,item) { 
                if ((item!=".") && (item!="..") && (item!=".DS_Store")) {
                    //alert(data);
                    var fileURL = 'compartilhados/'+item;
                    var codeURL = 'compartilhados-code/'+item.replace('.png','.txt');
                    var codeBlocksURL = 'compartilhados-code/'+item.replace('.png','.cp7');
                    var image = "<li class='compartilhados-item'><a rel='group1' class='grouped_elements fancyimages' href='"+fileURL+"' title='Ver a figura' data-cp7='"+codeBlocksURL+"' data-title='"+codeURL+"'><img src='"+fileURL+"'></a></li>";
                    //alert(fileURL);
                    $('.compartilhados').append(image);
                    $( "<a href='#' title='Carregar exemplo' class='compartilhados-load'></a>" ).appendTo( $('.compartilhados>li:last-of-type') );
                    //$('.compartilhados-item-link').trigger('myCustomEvent3');
					//$('.compartilhados-load').trigger('myCustomEvent4');
                }
            });
        // DEPOIS DE CARREGAR IMAGENS CRIA O SLIDER
        }
    }).done(function(){
			slider = $('.compartilhados').bxSlider({
				touchEnabled: true,
            	minSlides: 8,
  				maxSlides: 8,
				slideWidth: 100,
				adaptiveHeight: true,
				slideMargin: 20
			});
			$( "a:not(a.reset),input,.list-prog" ).trigger( "myCustomEvent2" );
            carregaExemplo();
	});

    // CARREGA EXEMPLO INICIAL: IMPLEMENTADO PARA O APPS.EDU @ CBIE/LACLO 2015
    function carregaExemplo() {
        // LÊ EXEMPLOS CARREGADOS VIA AJAX
        var exemplos = new Array();
        var exemploslogo = new Array();
        $('.compartilhados > li.compartilhados-item ').each(function(){
            var exemplo = $(this).children().attr('data-cp7');
            exemplos.push(exemplo);
            var exemplologo = $(this).children().attr('data-title');
            exemploslogo.push(exemplologo);
        });
        // ESCOLHE UM EXEMPLO ALEATÓRIO
        var key = Math.floor(Math.random() * exemplos.length);
        // MUDA PARA MODO DE PV
        $("#oldcode").stop(true,true).slideToggle('slow');
        $(".CodeMirror").stop(true,true).slideToggle('slow', function(){
            $('#code').load(exemploslogo[key], function(){
                cm.setValue($(this).text());
                cm.refresh();
            });


        });
        // MODO PV E DEPOIS CARREGA EXEMPLO
        $('#codeblocks').stop(true,true).slideToggle('slow', function(){
            $('#codeblocks').load(exemplos[key], function(){
                // ATIVA BLOCOS CARREGADOS DE ACORDO
                // TODO: OPERADORES E VARIÁVEIS
                ativarRepeat('reload');
                ativarProcedimentos('reload');
                ativarOperadores('reload');
                //ativarVariavel('reload');
                ativarInputs();  
                // MOSTRA MENSAGEM SOBRE EXEMPLO INICIAL
                $('#exemplo').dialog({
                  width: $('#exemplo').width(),
                  autoOpen: true,
                  title: 'Aviso',
                  buttons: [ { 
                    text: "Fechar", 
                    click: function() {
                        $(this).dialog("close");
                        // introJs().start();
                    }
                  }],
                  modal: false,
                  show: {
                    effect: "fade",
                    // direction: 'up',
                    duration: 600
                    },
                  hide: {
                    effect: "fade",
                    // direction: 'up',
                    duration: 600
                    }
                }).prev().addClass('ui-state-highlight');  
            });
        });    
    }
	  
	// INTERPRETADOR DE BLOCOS
	function BlocksParser(element) {
		//alert(element.attr('data-code'));
		if (element.attr('data-code')=="repeat") {
		    if (element.children().children('div').hasClass('funcao-operadores')) {
                // alert('operadores');
                if (element.children('div').children('div').hasClass('funcao-sum')) {
                    var comando = 'sum';
                    //alert(comando);
                } else if (element.children('div').children('div').hasClass('funcao-divide')) {
                    var comando = 'divide';
                } else if (element.children('div').children('div').hasClass('funcao-difference')) {
                    var comando = 'difference';
                } else if (element.children('div').children('div').hasClass('funcao-product')) {
                    var comando = 'product';
                }
                // alert(comando);
                var valor = new Array();
                element.children('div').children('div.funcao-operadores').children('div').each(function(index){
                    valor[index]=$(this).text();
                    if ($(this).hasClass('funcao-callvar')) {
                        valor[index] = ':'+valor[index];
                    }
                });
                var loops = comando + ' ' + valor[0] + ' ' + valor[1];
            } else {
                var loops = element.attr('data-loops');
    		    if (element.children().children('div.numero').hasClass('funcao-callvar')) {
    				loops = ':'+loops;
    			}
            } 
		    var codeToAdd = 'repeat '+loops+' [\n';//+element.text()+']\n';
            var space = '';
		    element.children('ol').children(":not(.head)").each(function(index){
		    	// if ($(this).attr('data-code')=='repeat') {
       //              space += '  ';
       //          } else {
       //              space = '';
       //          }
                codeToAdd += space + BlocksParser($(this));
		    });
		    codeToAdd += ']';
		    //alert(codeToAdd);
		} else if (element.attr('data-code')=="to") {
			var what = element.attr('data-what');
			var codeToAdd = 'to '+what+'\n';//+element.text()+'\nend\n';
			element.children('ol').children(':not(.head)').each(function(index){
				codeToAdd += BlocksParser($(this));
			});
			codeToAdd += 'end\n';
		} else if (element.attr('data-code')=="make") {
			var what = element.attr('data-what');
            if (element.children('div').children('div').hasClass('funcao-operadores')) {
                // alert('aki');//
                // var el1 = element.children('div.funcao-operadores').children('div.valor1');
                // var el2 = element.children('div.funcao-operadores').children('div.valor2')
                // var valor1 = el1.attr('data-valor1');
                // var valor2 = el2.attr('data-valor2');
                if (element.children('div').children('div').hasClass('funcao-sum')) {
                    var comando = 'sum';
                    //alert(comando);
                } else if (element.children('div').children('div').hasClass('funcao-divide')) {
                    var comando = 'divide';
                } else if (element.children('div').children('div').hasClass('funcao-difference')) {
                    var comando = 'difference';
                } else if (element.children('div').children('div').hasClass('funcao-product')) {
                    var comando = 'product';
                }

                var valor = new Array();
                element.children('div').children('div.funcao-operadores').children('div').each(function(index){
                    valor[index]=$(this).text();
                    if ($(this).hasClass('funcao-callvar')) {
                        valor[index] = ':'+valor[index];
                    }
                });
                // alert(el1);
                var codeToAdd = 'make \"'+what+' ' + comando + ' ' + valor[0] + ' ' + valor[1] + '\n';
            } else {
                //alert('oi');
                var value = element.attr('data-value');
                var codeToAdd = 'make \"'+what+' '+value+'\n';    
            }
			
		} else if (element.hasClass('funcao-movimento')) {
			var direction = element.attr('data-code');
            if (direction=="setxy") {
                var posx = element.attr('data-posx');
                var posy = element.attr('data-posy');
                if (element.children('div.numero').hasClass('funcao-callvar')) {
                    posx = ':'+posx;
                    posy = ':'+posy;
                }
                var codeToAdd = direction+' '+posx+' '+posy+'\n';
            } else if (element.children('div').hasClass('funcao-operadores')) {
                // var el1 = element.children('div.funcao-operadores').children('div.valor1');
                // var el2 = element.children('div.funcao-operadores').children('div.valor2')
                // var valor1 = el1.attr('data-valor1');
                // var valor2 = el2.attr('data-valor2');
                
                if (element.children('div').hasClass('funcao-sum')) {
                    var comando = 'sum';
                    //alert(comando);
                } else if (element.children('div').hasClass('funcao-divide')) {
                    var comando = 'divide';
                } else if (element.children('div').hasClass('funcao-difference')) {
                    var comando = 'difference';
                } else if (element.children('div').hasClass('funcao-product')) {
                    var comando = 'product';
                }

                var valor = new Array();
                element.children('div.funcao-operadores').children('div').each(function(index){
                    valor[index]=$(this).text();
                    if ($(this).hasClass('funcao-callvar')) {
                        valor[index] = ':'+valor[index];
                    }
                });
                // alert(el1);
                var codeToAdd = direction + ' ' + comando + ' ' + valor[0] + ' ' + valor[1] + '\n';

            } else {
                var amount = element.attr('data-amount');
                if (element.children('div').hasClass('funcao-callvar')) {
                    amount = ':'+amount;
                } 
                var codeToAdd = direction+' '+amount+'\n';
            }

		} else if (element.attr('data-code')=='sum') {
            var valor1 = element.attr('data-valor1');
            var valor2 = element.attr('data-valor2');
            if (element.children('div.valor1').hasClass('funcao-callvar')) {
                valor1 = ':'+valor1;
            } else if (element.children('div.valor2').hasClass('funcao-callvar')) {
                valor2 = ':'+valor2;
            }
            var codeToAdd = 'sum '+valor1+' '+valor2+'\n';
        } else if (element.attr('data-code')=='divide') {
            var valor1 = element.attr('data-valor1');
            var valor2 = element.attr('data-valor2');
            if (element.children('div.valor1').hasClass('funcao-callvar')) {
                valor1 = ':'+valor1;
            } else if (element.children('div.valor2').hasClass('funcao-callvar')) {
                valor2 = ':'+valor2;
            }
            var codeToAdd = 'divide '+valor1+' '+valor2+'\n';
        } else if (element.attr('data-code')=='difference') {
            var valor1 = element.attr('data-valor1');
            var valor2 = element.attr('data-valor2');
            if (element.children('div.valor1').hasClass('funcao-callvar')) {
                valor1 = ':'+valor1;
            } else if (element.children('div.valor2').hasClass('funcao-callvar')) {
                valor2 = ':'+valor2;
            }
            var codeToAdd = 'difference '+valor1+' '+valor2+'\n';
        } else if (element.attr('data-code')=='product') {
            var valor1 = element.attr('data-valor1');
            var valor2 = element.attr('data-valor2');
            if (element.children('div.valor1').hasClass('funcao-callvar')) {
                valor1 = ':'+valor1;
            } else if (element.children('div.valor2').hasClass('funcao-callvar')) {
                valor2 = ':'+valor2;
            }
            var codeToAdd = 'product '+valor1+' '+valor2+'\n';
        } else {
			var codeToAdd = element.attr('data-code')+'\n';
		}
		return codeToAdd;
	}

	// EXECUTA O CÓDIGO - recebe velocidade, mostrar ou não personagem
	function Executar(velocidade,showturtle) {
		// var valor_code = $("#code").val();
        var valor_code = cm.getValue();
		//answer = valor_code;
		var valor_resumo = valor_code.substr(0,10);
		// SE EXECUÇÃO NORMAL, SEM BLOCOS
		if ($('#codeblocks').is(':hidden')){
			 run(velocidade,showturtle);
		// EXECUÇÃO DE BLOCOS
		} else {
			var lenWithRed = $('#codeblocks>li:not(.placeholder)').length;
			// SE EXISTIREM BLOCOS
			if (lenWithRed>=1) {
				var code = '';
				var codeToAdd = '';
				// EXECUTAR SEM SELEÇÃO
				$('#codeblocks>li').each(function(index){
					if ((index == lenWithRed - 1)){
						code += BlocksParser($(this)) + ' ';
					} else {
						code += BlocksParser($(this));
					}
				});
				
                // ATUALIZA CÒDIGO
           		cm.setValue(code);
             
				// answer = $('#codeblocks').html();
			    // integração HTML5 iTarefa

                valor_code = cm.getValue();
				valor_resumo = valor_code.substr(0,10);
				len = $('.blocks>li').length;
			
                run(velocidade,showturtle);
			} else {
				// SEM BLOCOS
                alert('sem blocos');
			}
		}
	}

	function checkForMoves(funcao) {
		// CHECA PRA VER SE POSSUI CLASSE ABERTO, SE TIVER, REMOVE POIS JA SERÁ SEGUNDO CLICK, SE NAO ADICIONA
		// MOVIMENTO
		// ARRUMAR DEPOIS PASSANDO OBJETO COMANDOS JA FILTRADO JUNTO COM O VALOR UTILIZADO ASSIM EVITA DE DECLARAR NOVAMENTE - TA HORRÍVEL RSRS =)
		var valor_forward=$("#valor_forward");
		var valor_backward=$("#valor_backward");
		var valor_color=$("#valor_color");
		var valor_left=$("#valor_left");
		var valor_right=$("#valor_right");
		var valor_setx=$("#valor_setx");
		var valor_sety=$("#valor_sety");
		var valor_setxy=$("#valor_setxy");
		// CONTROLE
		var valor_repeat=$("#valor_repeat");
		var valor_to=$("#valor_to");
		var valor_call=$("#valor_call");

		// DADOS
		var valor_make=$("#valor_make");
		var valor_callvar=$("#valor_callvar");

        // OPERADORES
        var valor_sum = $('#valor_sum');
        var valor_divide = $('#valor_divide');
        var valor_difference = $('#valor_difference');
        var valor_product = $('#valor_product');

		// CRIA OBJETO
		comandos = {
			'forward':{
				'element':valor_forward,
				'text':'para frente',
				'command': 'forward'
			},
			'backward':{
				'element':valor_backward,
				'text':'para trás',
				'command': 'backward'
			},
			'call': {
				'element':valor_call,
				'text':'call',
				'command': 'call'
			},
			'callvar': {
				'element':valor_callvar,
				'text':'callvar',
				'command': 'callvar'
			},
			'color':{
				'element':valor_color,
				'text':'color',
				'command': 'color'
			},
			'left':{
				'element':valor_left,
				'text':'girar à esquerda',
                // 'textleft':'girar',
                // 'textright':'a direita',
				'command': 'left'
			},
			'make':{
				'element':valor_make,
				'text':'make',
				'command': 'make'
			},
			'right':{
				'element':valor_right,
				'text':'girar à direita',
				'command': 'right'
			},
			'reset':{
				'element':'',
				'text':'limpar',
				'command': 'reset'
			},
			'repeat':{
				'element':valor_repeat,
				'text':'repetir',
				'command': 'repeat'
			},
			'penup':{
				'element':'',
				'text':'parar de escrever',
				'command': 'penup'
			},
			'pendown':{
				'element':'',
				'text':'escrever',
				'command': 'pendown'
			},
			'setx':{
				'element':valor_setx,
				'text':'ir para x',
				'command': 'setx'
			},
			'sety':{
				'element':valor_sety,
				'text':'ir para y',
				'command': 'sety' 
			},
			'setxy':{
				'element':valor_setxy,
				'text':'ir para x y',
				'command': 'setxy' 
			},
			'to':{
				'element':valor_to,
				'text':'ação',
				'command': 'to' 
			},
            'sum':{
                'element':valor_sum,
                'text':'somar',
                'command': 'sum' 
            },
            'divide':{
                'element':valor_divide,
                'text':'dividir',
                'command': 'divide' 
            },
            'difference':{
                'element':valor_difference,
                'text':'diminuir',
                'command': 'difference' 
            },
            'product':{
                'element':valor_product,
                'text':'multiplicar',
                'command': 'product' 
            }
		};
		
        if (comandos[funcao].text=="color") {
            if (comandos[funcao].element.hasClass('aberto')) {
                comandos[funcao].element.removeClass('aberto');
            } else {
                comandos[funcao].element.addClass('aberto');
            }
            comandos[funcao].element.fadeToggle('slow').focus();
		    var move = comandos[funcao].element.val();
        } else {
            var move = comandos[funcao].element.val();
        }
        //alert('Valor: ' + move);
		return move;
	}

    function updateDataCode(obj, val) {
        if (obj.parent().parent().hasClass('funcao-repeat')) {
            obj.parent().parent().attr('data-loops',val);   
        } else if (obj.parent().parent().hasClass('funcao-procedimento')) {
            obj.parent().parent().attr('data-what',val);    
        } else if (obj.parent().parent().hasClass('funcao-make')) {
            if (obj.hasClass('funcao-callvar')) {
                val = ':'+val;
            }
            obj.parent().parent().attr('data-value',val);   
        } else if (obj.parent().hasClass('funcao-movimento')) {
            // alert(obj.attr('data-code'));
            if (obj.parent().attr('data-code')=='setxy') {
                if (obj.hasClass('posx')) {
                    obj.parent().attr('data-posx',val);
                } else if (obj.hasClass('posy')) {
                    obj.parent().attr('data-posy',val);
                }
            } else {
                obj.parent().attr('data-amount',val);
            }   
        } else if (obj.parent().hasClass('funcao-operadores')) {
            //alert(val);
            // procurar um jeito de dividir a string e detectar qual input está sendo afetado, depois formatar e setar
            //var total = obj.parent().parent().attr('data-amount').split(" ");
            //alert(total[0]+total[1]+total[2]);
            // alert(total);
            if (obj.hasClass('valor1')) {
                obj.parent().attr('data-valor1', val);
            } else if (obj.hasClass('valor2')) {
                obj.parent().attr('data-valor2', val);
            }
            // var newtotal = total[0]+total[1]+total[2];
            // alert(newtotal);
            //obj.parent().parent().attr('data-amount', val);
        }
    }

	function updateDataCodeVariavel(obj, val) {
		if (obj.parent().parent().hasClass('funcao-make')) {
			obj.parent().parent().attr('data-what',val);	
		}
	}

	$('body').delegate('.numero:not(.name)', 'change', function(){
		updateDataCode($(this),$(this).text());
		//console.log('ok');
	})

	$('body').delegate('.name', 'change', function(){
		updateDataCodeVariavel($(this),$(this).text());
		//console.log('ok');
	})

	$('body').delegate('.numero', 'click', function(){
		if (!$(this).hasClass('focus')) {
			$(this).focus();
		} else {
			$(this).blur();
		}
	})

	// $(".numero").keypress(function(event) {
	//     var keycode = (event.keyCode ? event.keyCode : event.which);
	//     if(keycode == '13') {
	//         alert('You pressed a "enter" key in somewhere');    
	//     }
	// });


	// $('.numero').blur(function(){
 //   		$('input').removeClass("focus");
 //   	}).focus(function() {		
 //        $(this).addClass("focus")
 //   	});

	$('div:not(div.numero),li, ol, ul').on('click', function(){
		if ($('.numero').hasClass('focus')) {
			$('.numero').blur();
		}		
	});

	$('body').on('keypress', 'div.numero', function (event) { 
    	var keycode = (event.keyCode ? event.keyCode : event.which);
	    if(keycode == '13') {
	       $(this).blur();  
	    }
	});

    // remove letras do nome da variável função

	$('body').on('keyup', 'div.numero:not(div.name,div.procedimento-input)', function (event) { 
    	var keycode = (event.keyCode ? event.keyCode : event.which);
	    // if (event.keyCode >= 48 && event.keyCode <= 57) {
	    // 	// alert("input was 0-9");
	    // }
	    if (event.keyCode >= 65 && event.keyCode <= 90){
			// alert("input was a-z");
			// }
	    	// var texto = $(this).text();
	    	// var find = '^[0-9]*$';
			// var re = new RegExp(find, 'g');
			// str = texto.replace(re, '');
			// alert(str);
			$(this).text('');
		}
	});
	

	// CONTENTEDITABLE JQUERY ONCHANGE FIX

	$('body').on('focus', '.numero', function() {
		$(this).addClass("focus")
	    var $this = $(this);
	    $this.data('before', $this.html());
	    return $this;
	}).on('blur keyup paste input', '.numero', function() {
		$(this).removeClass("focus");
	    var $this = $(this);
	    if ($this.data('before') !== $this.html()) {
	        $this.data('before', $this.html());
	        $this.trigger('change');
	    }
	    return $this;
	});

	// CRIA BLOCO E ADICIONA CÓDIGO
	// TODO: FÁBRICA DE BLOCOS
	function ativarRepeat(status) {
		//alert(status);
		if (status=="load") {
			$('#codeblocks > .funcao-repeat:last-of-type > .funcao-repeat-head > .numero').draggable({
				cursor:'move',
				appendTo: 'body',
				helper: 'clone'
			}).droppable({
		        activeClass: "ui-state-highlight",
		        hoverClass: "grudar",
		        // accept: "div.numero:not(.ui-sortable-helper)",
                accept: function(d) { 
                    if (d.hasClass("numero") || d.hasClass("funcao-operadores")){ 
                        return true;
                    }
                },
		        tolerance:  'touch',

		        // drop: function( event, ui ) {
			       //  // $( this ).find( ".placeholder" ).remove();
			       //  // $( "<li class='codeblocks-list-item' title='Bloco personalizado' data-code='"+ui.draggable.attr('data-code')+"'></li>" ).text( ui.draggable.attr('data-code') ).appendTo( this );
			       //  // $( "<span class='codeblocks-list-trash'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		      	 //    $(this).text(ui.draggable.text());

		      	 //    if (ui.draggable.hasClass('variavel')) {
		      	 //    	$(this).addClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','false');
		      	 //    	ui.draggable.remove();
		      	 //    } else if (ui.draggable.hasClass('funcao-callvar')) {
		      	 //    	$(this).addClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','false');
		      	 //    } else {
		      	 //    	$(this).removeClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','true');
		      	 //    }
		      	    
		      	 //    //$(this).parent().append(ui.draggable);
		      	 //    updateDataCode($(this),ui.draggable.text());
		      	 //    clicksound.playclip();
		        // }   
                drop: function( event, ui ) {
                            // $(this).text(ui.draggable.text());
                            if (ui.draggable.hasClass('variavel')) {
                                $(this).text(ui.draggable.text());
                                $(this).addClass('funcao-callvar');
                                $(this).attr('contenteditable','false');
                                ui.draggable.remove();
                            } else if (ui.draggable.hasClass('funcao-callvar')) {
                                $(this).text(ui.draggable.text());
                                $(this).addClass('funcao-callvar');
                                if ($(this).hasClass('funcao-operadores')) {
                                    $(this).removeClass('funcao-operadores')
                                    .addClass('numero');
                                }
                                $(this).attr('contenteditable','false');
                            } else if (ui.draggable.hasClass('funcao-operadores')) {
                                //alert('operadores');
                                // $(this).addClass('funcao-operadores');
                                // $(this).attr('contenteditable','false');
                                // $(this).html(ui.draggable.html());
                                //alert(ui.draggable.text());
                                var valores = ui.draggable.text().split(" ");
                                if (ui.draggable.attr('data-code')=='sum') {
                                    var classToAdd = 'funcao-sum';
                                    $(this).removeClass('funcao-divide').removeClass('funcao-difference').removeClass('funcao-product');
                                    // var classToRemove = 'funcao-divide';
                                } else if (ui.draggable.attr('data-code')=='divide') {
                                    var classToAdd = 'funcao-divide';
                                    // var classToRemove = 'funcao-sum';
                                    $(this).removeClass('funcao-sum').removeClass('funcao-difference').removeClass('funcao-product');
                                } else if (ui.draggable.attr('data-code')=='difference') {
                                    var classToAdd = 'funcao-difference';
                                    $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-product');
                                } else if (ui.draggable.attr('data-code')=='product') {
                                    var classToAdd = 'funcao-product';
                                    $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-difference');
                                }
                                $(this).html('')
                                .removeClass('numero')
                                .removeClass('funcao-callvar')
                                // .removeClass(classToRemove)
                                .addClass('funcao-operadores')
                                .addClass(classToAdd)
                                .attr('contenteditable','false')
                                .append(ui.draggable.html());
                                //.append('<div contenteditable="false" class="numero valor1">'+valores[0]+'</div> + <div contenteditable="false" class="numero valor2">'+valores[2]+'</div>');//remove();
                                // alert(ui.draggable.html());
                                // $(this).html(ui.draggable.html());
                                ui.draggable.remove();
                            } else {
                                $(this).text(ui.draggable.text());
                                $(this).removeClass('funcao-callvar');
                                $(this).removeClass('funcao-operadores');
                                $(this).removeClass('funcao-sum')
                                .removeClass('funcao-divide')
                                .removeClass('funcao-difference')
                                .removeClass('funcao-product');                           
                                if (!$(this).hasClass('numero')) {
                                    $(this).addClass('numero');
                                }
                                $(this).attr('contenteditable','true');
                            }
                            updateDataCode($(this),ui.draggable.text());
                            clicksound.playclip();
                        }  
		    });
			$('#codeblocks > .funcao-repeat:last-of-type > .codeblocks-repeat').sortable({
		      items: "li:not(.blocks-text)",
		      cursor: 'move',
		      connectWith: '#codeblocks',
		      placeholder: "blocks-placeholder",
		      delay: 150,
		      dropOnEmpty: true,
		      receive: function( event, ui ) {
		      	$(this).find('.blocks-text').remove();
		      	 //alert('recebeu:');// + ui.item.attr('data-code'));
		      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
			     //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		      },
		      sort: function() {
		        // gets added unintentionally by droppable interacting with sortable
		        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
		        $( this ).removeClass( "ui-state-default" );
		    	},
		      update: function() {
		      	$( this ).removeClass( "ui-state-default" );
		      	clicksound.playclip();
		      }
			});
		} else {
			//alert('oi');
			
			$('.codeblocks-repeat').sortable({
		      items: "li:not(.blocks-text)",
		      cursor: 'move',
		      connectWith: '#codeblocks',
		      placeholder: "blocks-placeholder",
		      delay: 150,
		      dropOnEmpty: true,
		      receive: function( event, ui ) {
		      	$(this).find('.blocks-text').remove();
		      	 //alert('recebeu:');// + ui.item.attr('data-code'));
		      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
			     //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		      },
		      sort: function() {
		        // gets added unintentionally by droppable interacting with sortable
		        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
		        $( this ).removeClass( "ui-state-default" );
		    	},
		      update: function() {
		      	$( this ).removeClass( "ui-state-default" );
		      	clicksound.playclip();
		      }
			});	
		}
	}

	function ativarProcedimentos(status) {
		if (status=="load") {
			$('#codeblocks > .funcao-procedimento > .codeblocks-procedimento').sortable({
		      items: "li:not(.blocks-text)",
		      cursor: 'move',
		      connectWith: '#codeblocks',
		      placeholder: "blocks-placeholder",
		      delay: 150,
		      dropOnEmpty: true,
		      receive: function( event, ui ) {
		      	$(this).find('.blocks-text').remove();
		      	 //alert('recebeu:');// + ui.item.attr('data-code'));
		      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
			     //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		      },
		      sort: function() {
		        // gets added unintentionally by droppable interacting with sortable
		        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
		        $( this ).removeClass( "ui-state-default" );
		    	},
		      update: function() {
		      	clicksound.playclip();
		      }
			});		
		} else {
			$('.codeblocks-procedimento').sortable({
		      items: "li:not(.blocks-text)",
		      cursor: 'move',
		      connectWith: '#codeblocks',
		      placeholder: "blocks-placeholder",
		      delay: 150,
		      dropOnEmpty: true,
		      receive: function( event, ui ) {
		      	$(this).find('.blocks-text').remove();
		      	 //alert('recebeu:');// + ui.item.attr('data-code'));
		      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
			     //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		      },
		      sort: function() {
		        // gets added unintentionally by droppable interacting with sortable
		        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
		        $( this ).removeClass( "ui-state-default" );
		    	},
		      update: function() {
		      	clicksound.playclip();
		      }
			});		
		}
	}

	function ativarVariavel(status) {
		if (status=="load") {
			$('#codeblocks > .funcao-make:last-of-type > .funcao-make-head > .name').draggable({
				cursor:'move',
	    		appendTo: 'body',
	    		helper: 'clone',
	    		containment: '#codeblocks',
	    		start: function() {
	    			$(this).addClass('funcao-callvar');
	    		}
			});

			$('#codeblocks > .funcao-make:last-of-type > .funcao-make-head > .value').draggable({
				cursor:'move',
	    		appendTo: 'body',
	    		helper: 'clone'
			}).droppable({
		        activeClass: "ui-state-highlight",
		        hoverClass: "grudar",
		        //accept: "div.numero:not(.ui-sortable-helper)",
                accept: function(d) { 
                    if (d.hasClass("numero") || d.hasClass("funcao-operadores")){ 
                        return true;
                    }
                },
		        tolerance:  'touch',
		        // drop: function( event, ui ) {
			       //  // $( this ).find( ".placeholder" ).remove();
			       //  // $( "<li class='codeblocks-list-item' title='Bloco personalizado' data-code='"+ui.draggable.attr('data-code')+"'></li>" ).text( ui.draggable.attr('data-code') ).appendTo( this );
			       //  // $( "<span class='codeblocks-list-trash'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		       	//     $(this).text(ui.draggable.text());
		      	    
		      	 //    if (ui.draggable.hasClass('variavel')) {
		      	 //    	$(this).addClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','false');
		      	 //    	ui.draggable.remove();
		      	 //    } else if (ui.draggable.hasClass('funcao-callvar')) {
		      	 //    	$(this).addClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','false');
		      	 //    } else {
		      	 //    	$(this).removeClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','true');
		      	 //    }
		      	    
		      	 //    updateDataCode($(this),ui.draggable.text());
		      	 //    clicksound.playclip();
		        // }   
                drop: function( event, ui ) {
                                // $(this).text(ui.draggable.text());
                                if (ui.draggable.hasClass('variavel')) {
                                    $(this).text(ui.draggable.text());
                                    $(this).addClass('funcao-callvar');
                                    $(this).attr('contenteditable','false');
                                    ui.draggable.remove();
                                } else if (ui.draggable.hasClass('funcao-callvar')) {
                                    $(this).text(ui.draggable.text());
                                    $(this).addClass('funcao-callvar');
                                    if ($(this).hasClass('funcao-operadores')) {
                                        $(this).removeClass('funcao-operadores')
                                        .addClass('numero');
                                    }
                                    $(this).attr('contenteditable','false');
                                } else if (ui.draggable.hasClass('funcao-operadores')) {
                                    //alert('operadores');
                                    // $(this).addClass('funcao-operadores');
                                    // $(this).attr('contenteditable','false');
                                    // $(this).html(ui.draggable.html());
                                    //alert(ui.draggable.text());
                                    var valores = ui.draggable.text().split(" ");
                                    if (ui.draggable.attr('data-code')=='sum') {
                                        var classToAdd = 'funcao-sum';
                                        $(this).removeClass('funcao-divide').removeClass('funcao-difference').removeClass('funcao-product');
                                        // var classToRemove = 'funcao-divide';
                                    } else if (ui.draggable.attr('data-code')=='divide') {
                                        var classToAdd = 'funcao-divide';
                                        // var classToRemove = 'funcao-sum';
                                        $(this).removeClass('funcao-sum').removeClass('funcao-difference').removeClass('funcao-product');
                                    } else if (ui.draggable.attr('data-code')=='difference') {
                                        var classToAdd = 'funcao-difference';
                                        $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-product');
                                    } else if (ui.draggable.attr('data-code')=='product') {
                                        var classToAdd = 'funcao-product';
                                        $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-difference');
                                    }
                                    $(this).html('')
                                    .removeClass('numero')
                                    .removeClass('funcao-callvar')
                                    // .removeClass(classToRemove)
                                    .addClass('funcao-operadores')
                                    .addClass(classToAdd)
                                    .attr('contenteditable','false')
                                    .append(ui.draggable.html());
                                    //.append('<div contenteditable="false" class="numero valor1">'+valores[0]+'</div> + <div contenteditable="false" class="numero valor2">'+valores[2]+'</div>');//remove();
                                    // alert(ui.draggable.html());
                                    // $(this).html(ui.draggable.html());
                                    ui.draggable.remove();
                                } else {
                                    $(this).text(ui.draggable.text());
                                    $(this).removeClass('funcao-callvar');
                                    $(this).removeClass('funcao-operadores');
                                    $(this).removeClass('funcao-sum')
                                    .removeClass('funcao-divide')
                                    .removeClass('funcao-difference')
                                    .removeClass('funcao-product');                           
                                    if (!$(this).hasClass('numero')) {
                                        $(this).addClass('numero');
                                    }
                                    $(this).attr('contenteditable','true');
                                }
                                updateDataCode($(this),ui.draggable.text());
                                clicksound.playclip();
                            }   
		    });
		}
	}

    function ativarOperadores(status) {
        if (status=="load") {
             $('#codeblocks > .funcao-operadores:last-of-type').draggable({
                cursor:'move',
                appendTo: '#codeblocks',
                helper: 'clone'
            });

            $('#codeblocks > .funcao-operadores:last-of-type > .numero').draggable({
                cursor:'move',
                appendTo: 'body',
                helper: 'clone'
            }).droppable({
                activeClass: "ui-state-highlight",
                hoverClass: "grudar",
                accept: "div.numero:not(.ui-sortable-helper)",
                tolerance:  'touch',
                drop: function( event, ui ) {
                    $(this).text(ui.draggable.text());
                    
                    if (ui.draggable.hasClass('variavel')) {
                        $(this).addClass('funcao-callvar');
                        $(this).attr('contenteditable','false');
                        ui.draggable.remove();
                    } else if (ui.draggable.hasClass('funcao-callvar')) {
                        $(this).addClass('funcao-callvar');
                        $(this).attr('contenteditable','false');
                    } else {
                        $(this).removeClass('funcao-callvar');
                        $(this).attr('contenteditable','true');
                    }
 
                    updateDataCode($(this),ui.draggable.text());
                    clicksound.playclip();
                }   
            });
        } else {
            // alert('oi');
            $('.funcao-operadores').draggable({
                cursor:'move',
                appendTo: 'body',
                helper: 'clone'
            });

            // $('.numero').draggable({
            //     cursor:'move',
            //     appendTo: 'body',
            //     helper: 'clone'
            // }).droppable({
            //     activeClass: "ui-state-highlight",
            //     hoverClass: "grudar",
            //     accept: "div.numero:not(.ui-sortable-helper)",
            //     tolerance:  'touch',
            //     drop: function( event, ui ) {
            //         $(this).text(ui.draggable.text());
                    
            //         if (ui.draggable.hasClass('variavel')) {
            //             $(this).addClass('funcao-callvar');
            //             $(this).attr('contenteditable','false');
            //             ui.draggable.remove();
            //         } else if (ui.draggable.hasClass('funcao-callvar')) {
            //             $(this).addClass('funcao-callvar');
            //             $(this).attr('contenteditable','false');
            //         } else {
            //             $(this).removeClass('funcao-callvar');
            //             $(this).attr('contenteditable','true');
            //         }
 
            //         updateDataCode($(this),ui.draggable.text());
            //         clicksound.playclip();
            //     }   
            // });

        }
    }


	function ativarInputs() {
		$('div.numero:not(div.procedimento-input,div.name)').draggable({
				cursor:'move',
				appendTo: 'body',
				helper: 'clone'
			}).droppable({
		        activeClass: "ui-state-highlight",
		        hoverClass: "grudar",
		        // accept: "div.numero:not(.ui-sortable-helper)",
                accept: function(d) { 
                    if (d.hasClass("numero") || d.hasClass("funcao-operadores")){ 
                        return true;
                    }
                },
		        tolerance:  'touch',
		        // drop: function( event, ui ) {
			       //  // $( this ).find( ".placeholder" ).remove();
			       //  // $( "<li class='codeblocks-list-item' title='Bloco personalizado' data-code='"+ui.draggable.attr('data-code')+"'></li>" ).text( ui.draggable.attr('data-code') ).appendTo( this );
			       //  // $( "<span class='codeblocks-list-trash'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
		      	 //    $(this).text(ui.draggable.text());

		      	 //    if (ui.draggable.hasClass('variavel')) {
		      	 //    	$(this).addClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','false');
		      	 //    	ui.draggable.remove();
		      	 //    } else if (ui.draggable.hasClass('funcao-callvar')) {
		      	 //    	$(this).addClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','false');
		      	 //    } else {
		      	 //    	$(this).removeClass('funcao-callvar');
		      	 //    	$(this).attr('contenteditable','true');
		      	 //    }
		      	    
		      	 //    //$(this).parent().append(ui.draggable);
		      	 //    updateDataCode($(this),ui.draggable.text());
		      	 //    clicksound.playclip();
		        // }   
                drop: function( event, ui ) {
                            // $(this).text(ui.draggable.text());
                            if (ui.draggable.hasClass('variavel')) {
                                $(this).text(ui.draggable.text());
                                $(this).addClass('funcao-callvar');
                                $(this).attr('contenteditable','false');
                                ui.draggable.remove();
                            } else if (ui.draggable.hasClass('funcao-callvar')) {
                                $(this).text(ui.draggable.text());
                                $(this).addClass('funcao-callvar');
                                if ($(this).hasClass('funcao-operadores')) {
                                    $(this).removeClass('funcao-operadores')
                                    .addClass('numero');
                                }
                                $(this).attr('contenteditable','false');
                            } else if (ui.draggable.hasClass('funcao-operadores')) {
                                //alert('operadores');
                                // $(this).addClass('funcao-operadores');
                                // $(this).attr('contenteditable','false');
                                // $(this).html(ui.draggable.html());
                                //alert(ui.draggable.text());
                                var valores = ui.draggable.text().split(" ");
                                if (ui.draggable.attr('data-code')=='sum' || ui.draggable.hasClass('funcao-sum')) {
                                    var classToAdd = 'funcao-sum';
                                    $(this).removeClass('funcao-divide').removeClass('funcao-difference').removeClass('funcao-product');
                                    // var classToRemove = 'funcao-divide';
                                } else if (ui.draggable.attr('data-code')=='divide' || ui.draggable.hasClass('funcao-divide')) {
                                    var classToAdd = 'funcao-divide';
                                    // var classToRemove = 'funcao-sum';
                                    $(this).removeClass('funcao-sum').removeClass('funcao-difference').removeClass('funcao-product');
                                } else if (ui.draggable.attr('data-code')=='difference' || ui.draggable.hasClass('funcao-difference')) {
                                    var classToAdd = 'funcao-difference';
                                    $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-product');
                                } else if (ui.draggable.attr('data-code')=='product' || ui.draggable.hasClass('funcao-product')) {
                                    var classToAdd = 'funcao-product';
                                    $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-difference');
                                }
                                //alert(classToAdd);
                                $(this).html('')
                                .removeClass('numero')
                                .removeClass('funcao-callvar')
                                // .removeClass(classToRemove)
                                .addClass('funcao-operadores')
                                .addClass(classToAdd)
                                .attr('contenteditable','false')
                                .append(ui.draggable.html());
                                //.append('<div contenteditable="false" class="numero valor1">'+valores[0]+'</div> + <div contenteditable="false" class="numero valor2">'+valores[2]+'</div>');//remove();
                                // alert(ui.draggable.html());
                                // $(this).html(ui.draggable.html());
                                ui.draggable.remove();
                            } else {
                                $(this).text(ui.draggable.text());
                                $(this).removeClass('funcao-callvar');
                                $(this).removeClass('funcao-operadores');
                                $(this).removeClass('funcao-sum')
                                .removeClass('funcao-divide')
                                .removeClass('funcao-difference')
                                .removeClass('funcao-product');                           
                                if (!$(this).hasClass('numero')) {
                                    $(this).addClass('numero');
                                }
                                $(this).attr('contenteditable','true');
                            }
                            updateDataCode($(this),ui.draggable.text());
                            clicksound.playclip();
                        }  
		    });
		
		$('div.name').draggable({
			cursor:'move',
    		appendTo: 'body',
    		helper: 'clone',
    		containment: '#codeblocks',
    		start: function() {
    			$(this).addClass('funcao-callvar');
    		}
		});

	}

	function adicionarCodigo(funcao) {
		// SE ELEMENTO TIVER INPUT
        //alert('funcao:' + funcao);
		if (comandos[funcao].element!="") {
			var move = checkForMoves(funcao);
			var erro = false;
			// 	SE JÁ FOI DIGITADO ALGUM VALOR PARA O INPUT
            // alert(move);
			if (move!=0 && move!="#000000") {
				//alert(move);
				// SE BLOCOS VISÍVEIS, CRIA BLOCOS
				if ($("#codeblocks").is(":visible")){
					if (funcao=="repeat") {
						var textToBlock = '';
						$("#codeblocks").find( ".placeholder" ).remove();
						$( "<li class='funcao-repeat codeblocks-list-item' title='Repeat "+move+"' data-code='repeat' data-loops='"+move+"'><div class='funcao-repeat-head'>repetir <div contenteditable='true' class='numero'>"+move+"</div> vezes</div></li>" ).appendTo( $("#codeblocks") );
						$("#codeblocks > .funcao-repeat:last-of-type").append("<ol class='codeblocks-repeat'><li class='blocks-text'>Arraste para cá os Blocos</li></ol>");//+textToBlock+"</ol>");
						$( "<span class='codeblocks-list-trash funcao-repeat-trash' title='Excluir'></span>" ).appendTo( $("#codeblocks > .funcao-repeat:last-of-type ") );
						ativarRepeat('load');
					} else if (funcao=="to") {
						var textToAdd = '';
						$("#codeblocks").find( ".placeholder" ).remove();
						$( "<li title='Procedimento "+move+"' class='funcao-procedimento codeblocks-list-item' data-code='to' data-what='"+move+"'><div class='funcao-procedimento-head'>defina <div contenteditable='true' class='procedimento-input numero'>"+move+"</div></div></li>" ).appendTo( $("#codeblocks") );
				   	    $("#codeblocks > .funcao-procedimento:last-of-type").append("<ol class='codeblocks-procedimento'><li class='blocks-text'>Arraste pra cá os blocos</li></ol>");//+textToBlock+"</ol>");
						$( "<span class='codeblocks-list-trash' title='Excluir'></span>" ).appendTo( $('#codeblocks > .funcao-procedimento:last-of-type') );
						ativarProcedimentos('load');
                        // checkProcedimentos();
					} else if (funcao=="color") {
						function hexToRgb(hex) {
						    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
						    return result ? {
						        r: parseInt(result[1], 16),
						        g: parseInt(result[2], 16),
						        b: parseInt(result[3], 16)
						    } : null;
						}
						var bgcolor = hexToRgb(move).r + ',' + hexToRgb(move).g + ',' + hexToRgb(move).b;
						$("#codeblocks").find( ".placeholder" ).remove();
	        			$( "<li title='Cor' style='background-color: rgb("+bgcolor+")'  class='editable codeblocks-list-item' data-code='"+(comandos[funcao].text + ' [' + hexToRgb(move).r + ' ' + hexToRgb(move).g + ' ' + hexToRgb(move).b + ']')+"'></li>" ).text( comandos[funcao].text + ' [' + hexToRgb(move).r + ' ' + hexToRgb(move).g + ' ' + hexToRgb(move).b + '] ').appendTo( $("#codeblocks") );
	        			$( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item:last-of-type') );
					} else if (funcao=="call") {
						$("#codeblocks").find( ".placeholder" ).remove();
	        			$( "<li title='Executar "+move+"' class='editable funcao-call codeblocks-list-item' data-code='"+move+"'></li>" ).text(move+' ').appendTo( $("#codeblocks") );
	        			$( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item:last-of-type') );
					} else if (funcao=="make") {
                        // alert('make');
						$("#codeblocks").find( ".placeholder" ).remove();
						$( "<li title='Criar variável "+move+"' class='funcao-make codeblocks-list-item' data-code='make' data-what='"+move+"' data-value='valor'><div class='funcao-make-head'>variável <div contenteditable='true' class='name numero'>"+move+"</div>&nbsp; = &nbsp;<div contenteditable='true' class='value numero'>valor</div></div></li>" ).appendTo( $("#codeblocks") );
						$( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item:last-of-type') );
						ativarVariavel('load');
				    } else if (funcao=="sum") {
                        // alert('make');
                        $("#codeblocks").find( ".placeholder" ).remove();
                        var posicoes = move.split(" ");
                        $( "<li title='Somar' class='editable funcao-operadores codeblocks-list-item-alt' data-code='"+(comandos[funcao].command)+ "' data-valor1='"+posicoes[0]+"' data-valor2='"+posicoes[1]+"'><div contenteditable='true' class='numero valor1'>"+posicoes[0]+"</div> + <div contenteditable='true' class='numero valor2'>"+posicoes[1]+"</div></li>" ).appendTo( $("#codeblocks") );
                        // $( "<li title='Somar "+move+"' class='funcao-make codeblocks-list-item' data-code='make' data-what='"+move+"' data-value='valor'><div class='funcao-make-head'>variável <div contenteditable='true' class='name numero'>"+move+"</div>&nbsp; = &nbsp;<div contenteditable='true' class='value numero'>valor</div></div></li>" ).appendTo( $("#codeblocks") );
                        $( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item-alt:last-of-type') );
                        ativarOperadores('load');
                    } else if (funcao=="divide") {
                        // alert('make');
                        $("#codeblocks").find( ".placeholder" ).remove();
                        var posicoes = move.split(" ");
                        $( "<li title='Somar' class='editable funcao-operadores codeblocks-list-item-alt' data-code='"+(comandos[funcao].command)+ "' data-valor1='"+posicoes[0]+"' data-valor2='"+posicoes[1]+"'><div contenteditable='true' class='numero valor1'>"+posicoes[0]+"</div> / <div contenteditable='true' class='numero valor2'>"+posicoes[1]+"</div></li>" ).appendTo( $("#codeblocks") );
                        // $( "<li title='Somar "+move+"' class='funcao-make codeblocks-list-item' data-code='make' data-what='"+move+"' data-value='valor'><div class='funcao-make-head'>variável <div contenteditable='true' class='name numero'>"+move+"</div>&nbsp; = &nbsp;<div contenteditable='true' class='value numero'>valor</div></div></li>" ).appendTo( $("#codeblocks") );
                        $( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item-alt:last-of-type') );
                        ativarOperadores('load');
                    } else if (funcao=="difference") {
                        // alert('make');
                        $("#codeblocks").find( ".placeholder" ).remove();
                        var posicoes = move.split(" ");
                        $( "<li title='Diminuir' class='editable funcao-operadores codeblocks-list-item-alt' data-code='"+(comandos[funcao].command)+ "' data-valor1='"+posicoes[0]+"' data-valor2='"+posicoes[1]+"'><div contenteditable='true' class='numero valor1'>"+posicoes[0]+"</div> - <div contenteditable='true' class='numero valor2'>"+posicoes[1]+"</div></li>" ).appendTo( $("#codeblocks") );
                        // $( "<li title='Somar "+move+"' class='funcao-make codeblocks-list-item' data-code='make' data-what='"+move+"' data-value='valor'><div class='funcao-make-head'>variável <div contenteditable='true' class='name numero'>"+move+"</div>&nbsp; = &nbsp;<div contenteditable='true' class='value numero'>valor</div></div></li>" ).appendTo( $("#codeblocks") );
                        $( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item-alt:last-of-type') );
                        ativarOperadores('load');
                    } else if (funcao=="product") {
                        // alert('make');
                        $("#codeblocks").find( ".placeholder" ).remove();
                        var posicoes = move.split(" ");
                        $( "<li title='Diminuir' class='editable funcao-operadores codeblocks-list-item-alt' data-code='"+(comandos[funcao].command)+ "' data-valor1='"+posicoes[0]+"' data-valor2='"+posicoes[1]+"'><div contenteditable='true' class='numero valor1'>"+posicoes[0]+"</div> * <div contenteditable='true' class='numero valor2'>"+posicoes[1]+"</div></li>" ).appendTo( $("#codeblocks") );
                        // $( "<li title='Somar "+move+"' class='funcao-make codeblocks-list-item' data-code='make' data-what='"+move+"' data-value='valor'><div class='funcao-make-head'>variável <div contenteditable='true' class='name numero'>"+move+"</div>&nbsp; = &nbsp;<div contenteditable='true' class='value numero'>valor</div></div></li>" ).appendTo( $("#codeblocks") );
                        $( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item-alt:last-of-type') );
                        ativarOperadores('load');
                    } else {
                        // MOVIMENTO
						//alert(funcao);
						$("#codeblocks").find( ".placeholder" ).remove();
	        			// $( "<li title='Movimento' class='editable funcao-movimento codeblocks-list-item' data-code='"+(comandos[funcao].command)+ "' data-amount='"+move+"'>"+comandos[funcao].text+" <div contenteditable='true' class='numero'>"+move+"</div></li>" ).appendTo( $("#codeblocks") );
	        			if (comandos[funcao].command == "setxy") {
                            //alert('oi');
                            //$( "<li title='Movimento' class='editable funcao-movimento codeblocks-list-item' data-code='"+(comandos[funcao].command)+ "' data-amount='"+move+"'>"+comandos[funcao].text+" <div contenteditable='true' class='numero'>"+move+"</div></li>" ).appendTo( $("#codeblocks") );
                            var posicoes = move.split(" ");
                            $( "<li title='Movimento' class='editable funcao-movimento codeblocks-list-item' data-code='"+(comandos[funcao].command)+ "' data-posx='"+posicoes[0]+"' data-posy='"+posicoes[1]+"'>"+comandos[funcao].text+" <div contenteditable='true' class='numero posx'>"+posicoes[0]+"</div>&nbsp;<div contenteditable='true' class='numero posy'>"+posicoes[1]+"</div></li>" ).appendTo( $("#codeblocks") );
                        } else {
                            $( "<li title='Movimento' class='editable funcao-movimento codeblocks-list-item' data-code='"+(comandos[funcao].command)+ "' data-amount='"+move+"'>"+comandos[funcao].text+" <div contenteditable='true' class='numero'>"+move+"</div></li>" ).appendTo( $("#codeblocks") );
                        }
                        $( "<span title='Excluir' class='codeblocks-list-trash'>" ).appendTo( $('#codeblocks >.codeblocks-list-item:last-of-type') );
	        			
                        $('#codeblocks >.codeblocks-list-item:last-of-type > .numero').draggable({
							cursor:'move',
				    		appendTo: 'body',
				    		helper: 'clone'
						}).droppable({
					        activeClass: "ui-state-highlight",
					        hoverClass: "grudar",
					        accept: function(d) { 
                                if (d.hasClass("numero") || d.hasClass("funcao-operadores")){ 
                                    return true;
                                }
                            },
					        tolerance:  'touch',
					        drop: function( event, ui ) {
						        // $(this).text(ui.draggable.text());
					      	    if (ui.draggable.hasClass('variavel')) {
                                    $(this).text(ui.draggable.text());
					      	    	$(this).addClass('funcao-callvar');
					      	    	$(this).attr('contenteditable','false');
					      	    	ui.draggable.remove();
					      	    } else if (ui.draggable.hasClass('funcao-callvar')) {
                                    $(this).text(ui.draggable.text());
					      	    	$(this).addClass('funcao-callvar');
                                    if ($(this).hasClass('funcao-operadores')) {
                                        $(this).removeClass('funcao-operadores')
                                        .addClass('numero');
                                    }
					      	    	$(this).attr('contenteditable','false');
					      	    } else if (ui.draggable.hasClass('funcao-operadores')) {
                                    //alert('operadores');
                                    // $(this).addClass('funcao-operadores');
                                    // $(this).attr('contenteditable','false');
                                    // $(this).html(ui.draggable.html());
                                    //alert(ui.draggable.text());
                                    var valores = ui.draggable.text().split(" ");
                                    if (ui.draggable.attr('data-code')=='sum') {
                                        var classToAdd = 'funcao-sum';
                                        $(this).removeClass('funcao-divide').removeClass('funcao-difference').removeClass('funcao-product');
                                        // var classToRemove = 'funcao-divide';
                                    } else if (ui.draggable.attr('data-code')=='divide') {
                                        var classToAdd = 'funcao-divide';
                                        // var classToRemove = 'funcao-sum';
                                        $(this).removeClass('funcao-sum').removeClass('funcao-difference').removeClass('funcao-product');
                                    } else if (ui.draggable.attr('data-code')=='difference') {
                                        var classToAdd = 'funcao-difference';
                                        $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-product');
                                    } else if (ui.draggable.attr('data-code')=='product') {
                                        var classToAdd = 'funcao-product';
                                        $(this).removeClass('funcao-divide').removeClass('funcao-sum').removeClass('funcao-difference');
                                    }
                                    $(this).html('')
                                    .removeClass('numero')
                                    .removeClass('funcao-callvar')
                                    // .removeClass(classToRemove)
                                    .addClass('funcao-operadores')
                                    .addClass(classToAdd)
                                    .attr('contenteditable','false')
                                    .append(ui.draggable.html());
                                    //.append('<div contenteditable="false" class="numero valor1">'+valores[0]+'</div> + <div contenteditable="false" class="numero valor2">'+valores[2]+'</div>');//remove();
                                    // alert(ui.draggable.html());
                                    // $(this).html(ui.draggable.html());
                                    ui.draggable.remove();
                                } else {
                                    $(this).text(ui.draggable.text());
					      	    	$(this).removeClass('funcao-callvar');
                                    $(this).removeClass('funcao-operadores');
                                    $(this).removeClass('funcao-sum')
                                    .removeClass('funcao-divide')
                                    .removeClass('funcao-difference')
                                    .removeClass('funcao-product');                               
                                    if (!$(this).hasClass('numero')) {
                                        $(this).addClass('numero');
                                    }
					      	    	$(this).attr('contenteditable','true');
					      	    }
					      	    updateDataCode($(this),ui.draggable.text());
					      	    clicksound.playclip();
					        }   
						});
					}
					$( ".codeblocks-list-item,.codeblocks-list-trash,.codeblocks-list-play" ).trigger( "ativarDicasBlocos" );
				// LINHA DE COMANDO APENAS
				} else {
					if (!erro) {
						// var atual = $('#code').val();
                        var atual = cm.getValue();
						if (funcao=="repeat") {
							//$("#code").val(comandos[funcao].command + ' ' + move + '[\n' + atual + ']\n');
                            cm.setValue(comandos[funcao].command + ' ' + move + '[\n' + atual + ']\n');
						} else if (funcao=="color") {
							function hexToRgb(hex) {
							    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
							    return result ? {
							        r: parseInt(result[1], 16),
							        g: parseInt(result[2], 16),
							        b: parseInt(result[3], 16)
							    } : null;
							}
							//alert(hexToRgb(move).r);
							cm.setValue(atual + comandos[funcao].command + ' [' + hexToRgb(move).r + ' ' + hexToRgb(move).g + ' ' + hexToRgb(move).b + ']\n');
						} else if (funcao=="to") {
							cm.setValue(comandos[funcao].command + ' ' + move + '\n' + atual + 'end\n');
						} else if (funcao=="call") {
							cm.setValue(atual +  move + '\n');
						} else if (funcao=="make") {
							move = "\""+move;
							cm.setValue(atual + comandos[funcao].command + ' ' + move + ' 0\n');
						}else {
							cm.setValue(atual + comandos[funcao].command + ' ' + move + '\n');
						}	
					}
				}
				//ZERA VALOR NO INPUT DO ELEMENTO
                //alert(funcao);
				if (funcao=='color') {
                    comandos[funcao].element.val('');    
                }
			}
		// CASO O ELEMENTO NÃO TENHA INPUT
		} else {
			// SE BLOCOS VISÍVEIS, CRIA BLOCO
			if ($("#codeblocks").is(":visible")){
				$("#codeblocks").find( ".placeholder" ).remove();
	        	$( "<li title='"+(comandos[funcao].text)+"' class='funcao-solta codeblocks-list-item' data-code='"+(comandos[funcao].command)+"'></li>" ).text(comandos[funcao].text+' ').appendTo( $("#codeblocks") );
	        	$( "<span title='Excluir' class='codeblocks-list-trash'></span>" ).appendTo( $('#codeblocks >.codeblocks-list-item:last-of-type') );
				$( ".codeblocks-list-item,.codeblocks-list-trash,.codeblocks-list-play" ).trigger( "ativarDicasBlocos" );
		    // LINHA DE COMANDO APENAS
		    } else {
				var atual = cm.getValue();
				cm.setValue(atual + comandos[funcao].command + '\n');
		    }
		}   
	}
	
	// FUNÇÃO PARA MOSTRAR SUBMENU
	function mostrarSubMenu(strSubMenu) {
        // se existe algum sub-menu aberto, fechar
        $('.sub-menu').each(function(index){
            if ($(this).css('display')=='block') {
                $(this).stop(true,true).fadeOut('slow').css('display', 'none');//fadeToggle('slow', function(){
                $("#sub-menu-"+strSubMenu).stop(true, true).fadeIn('slow').css('display', 'block');//fadeToggle('slow');
                    //alert(strMenu);
                // });
                return false;    
            }
        });
	}
	
	// AÇÕES DO MENU PRINCIPAL
	$("body").delegate('.principal','click',function(e) {
        // procura o elemento ativo e desativa
        $('.principal').each(function(index){
            if ($(this).hasClass('principal-active')) {
                $(this).removeClass('principal-active');
            }        
        });
        // ativa elemento do menu principal
        $(this).addClass('principal-active');
        // mostra submenu
		mostrarSubMenu($(this).attr("id"));
	});

	// CRIA LINKS PARA OS COMANDOS LISTADOS NO OBJETO COMANDOS E CRIADOS NO INDEX
	for (var item in comandos) {
	   var obj = comandos[item];
	   addclick(obj.command);
	}

    function checkProcedimentos() {
        // criar vetor
        // gravar cada nome de procedimento 
        // retornar esse vetor
        var procedimentos = new Array();
        $('#codeblocks>li').each(function(index){
            if ($(this).attr('data-code')=='to') {
                procedimentos.push($(this).attr('data-what'));    
            }
        });
        return procedimentos;

    }

    $('body').delegate('.lista-procedimentos-item','click',function(e){
        $('#valor_call').val($(this).text());
        adicionarCodigo('call');
        // alert($(this).text());
    });

	function addclick(value){
        if (value=='call') {
            $('body').delegate('#'+value+'','click',function(e){
                // alert($(this).css('border'));
                checkProcedimentos();
                var procedimentos = checkProcedimentos();
                // alert(procedimentos);
                if (procedimentos.length>=1) {
                    if ($(this).hasClass('call-active')) {
                        $(this).removeClass('call-active');
                    } else {
                        $(this).addClass('call-active');
                    }
                    $('.lista-procedimentos-item').remove();
                    $('.lista-procedimentos').fadeToggle();
                    for (index = 0; index < procedimentos.length; index++) {
                        // text += fruits[index];
                        // alert(procedimentos[index]);
                        $('.lista-procedimentos').append('<li class="funcao-procedimento lista-procedimentos-item">' + procedimentos[index] + '</li>');
                    }
                } else {
                    alert('sem procedimentos para chamar');
                }
                
                // cria vetor para receber resultado de checkProcedimentos
                // lista valores do vetor e faz um append no html do sub-menu de procedimentos <li> vetor </li>
                // nesse append deve existir um botão de chamada direta para cada procedimento
                // adicionarCodigo(value) e passar também o nome do procedimento
                // ajustar a condição que cria o bloco dentro de adicionarCodigo()
            });
        // } else if (value=='make') {
        //      $('#valor_make').val($(this).text());
        //      adicionarCodigo('call');
        } else {
    		$('body').delegate('#'+value+'','click',function(e){
    			//alert('oi');
                //alert(value);
                adicionarCodigo(value);
    		});
        }
	}
	
	// PERSONAGEM ESCOLHER
	$('body').delegate("#personagem-escolher",'click',function(e){
		e.preventDefault();
		// $(this).parent().find('.extra-menu').fadeToggle('slow');
        $("#personagem-menu").dialog({
              autoOpen: true,
              title: 'Escolha seu personagem',
              closeText: 'Fechar',
              buttons: [ { 
                text: "Fechar", 
                click: function() {
                    $(this).dialog("close");
                }
              }],
              modal: false,
              show: {
                effect: "fade",
                
                duration: 600
                },
              hide: {
                effect: "fade",
                pieces: 16,
                duration: 600
                }
        }).prev().addClass('ui-state-success');;
	});

    // PERSONAGEM INICIAL ALEATÓRIO
    var personagens = new Array();
    $('.extra-menu>.extra-menu-item').each(function(){
        var nome = $(this).children().attr('data-src');
        personagens.push(nome);
    });
    var key = Math.floor(Math.random() * personagens.length);
    $("#turtle>embed").attr('src','images/personagens/'+ personagens[key]).css('display', 'block');
    
    // SELECIONAR NOVO PERSONAGEM

	$("body").delegate('.extra-menu>.extra-menu-item>.extra-menu-item-link','click',function(e){
		e.preventDefault();
		$("#turtle>embed").attr('src','images/personagens/'+$(this).attr('data-src'));
        $('#personagem-menu').dialog('close');
		// $(this).parent().parent().parent().find('.extra-menu').fadeToggle('slow');
	});

	// CRIA CAIXA DE AJUDA
	$( ".help" ).dialog({
      autoOpen: false,
      title: "Ajuda",
      closeText: 'Fechar',
      buttons: [ { 
      	text: "Ligar/Desligar dicas", 
      	click: function() {
      	 	var disabled = $( "a:not(.menu-link),input:not(.valor),.list-prog" ).tooltip( "option", "disabled" );
      		if (disabled){
				$("<p>Dicas ligadas</p>").dialog({
		              autoOpen: true,
		              title: 'Aviso',
		              closeText: 'Fechar',
		              buttons: [ { 
		                text: "Fechar", 
		                click: function() {
		                    $(this).dialog("close");
		                }
		              }],
		              modal: false,
		              show: {
		                effect: "drop",
		                
		                duration: 600
		                },
		              hide: {
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-highlight');
			} else {
				$("<p>Dicas desligadas</p>").dialog({
		              autoOpen: true,
		              title: 'Aviso',
		              closeText: 'Fechar',
		              buttons: [ { 
		                text: "Fechar", 
		                click: function() {
		                    $(this).dialog("close");
		                }
		              }],
		              modal: false,
		              show: {
		                effect: "drop",
		                
		                duration: 600
		                },
		              hide: {
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-highlight');;
			} 
			if (disabled){
				$("a:not(.menu-link),input:not(.valor),.list-prog").trigger('myCustomEvent2');
			 	$("a:not(.menu-link),input:not(.valor),.list-prog").tooltip("enable");	
			} else {
				$("a:not(.menu-link),input:not(.valor),.list-prog").trigger('myCustomEvent2');
				$("a:not(.menu-link),input:not(.valor),.list-prog").tooltip("disable");
			} 
      	}
      },
      {
      	text: "Vídeo Tutorial", 
      	click: function() {
      	 	$(this).dialog('close');
      	 	$( '#video' ).dialog({
              autoOpen: true,
              title: 'Vídeo Demonstração',
              closeText: 'Fechar',
              buttons: [ { 
                text: "Fechar", 
                click: function() {
                    $(this).dialog("close");
                }
              }],
              width: 810,
              height: 550,
              modal: false,
              show: {
                effect: "drop",
                
                duration: 600
                },
              hide: {
                effect: "explode",
                pieces: 16,
                duration: 600
                }
        	});
      	} 
      },
      {
      	text: "Fechar", 
      	click: function() {
      	 $( this ).dialog( "close" ); 
      	} 
      }],
      width: 800,
      height: 400,
      modal: false,
      show: {
        effect: "drop",
        
        duration: 600
			},
		  hide: {
        effect: "fade",
        
        duration: 600
			}
    });

	// MOSTRAR BLOCOS-MEMÓRIA
	$('body').delegate("#blocks-mostrar",'click',function(e){
		e.preventDefault();
		if ($('.blocks').has("li").length) {
			$('.blocks').toggle('slide',{'direction':'left'}, 500);
		} else {
			$("<p>Não existem blocos para recolher ainda!</p>").dialog({
	              autoOpen: true,
	              title: 'Aviso',
	              closeText: 'Fechar',
	              buttons: [ { 
	                text: "Fechar", 
	                click: function() {
	                    $(this).dialog("close");
	                }
	              }],
	              modal: false,
	              show: {
	                effect: "drop",
	                
	                duration: 300
	                },
	              hide: {
	                effect: "fade",
	                pieces: 16,
	                duration: 300
	                }
	        }).prev().addClass('ui-state-highlight');
		}
	});

	// MOSTRAR COMPARTILHADOS
	$("body").delegate('#compartilhados-mostrar','click',function(e){
		e.preventDefault();
		if ($('.compartilhados').css("display")=="block") {
			slider.destroySlider()	
			$('.compartilhados').fadeOut('slow');
		} else {					
			slider.reloadSlider();
			$('.compartilhados').fadeIn('slow');
		}
	});

	// ABRIR AJUDA
	$("body").delegate('#ajuda','click',function(e){
		e.preventDefault();
		$('.help').dialog('open');
	});
	
	// FUNÇÃO PARA LIMPAR A TELA
	function sacudirTela() {
		$('#sprite').css('opacity', '0');
		clearcanvas();
		setup();
		$('#oldcode').text('');
		$('#turtle').css('transform', 'rotate(0deg');
		$('.wrapper').addClass("shake");
		$('.wrapper').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
			$('.wrapper').removeClass("shake");
			$('#sprite').css('opacity', '1');
		});
	}
	
	// FUNÇÃO DE CONTROLE DE EXECUÇÃO - HABILITA BOTÃO DE EXECUTAR APENAS DEPOIS DO REINICIO DO PROGRAMA
	function reiniciar(obj, strButtonLabel, speed, mostrarPersonagem) {
		if ($(obj).hasClass("reset")){
			stop();
            $('#sprite').removeClass('anima');
			$(".executar").each(function(callback){
				if (!$(this).hasClass("reset")){
					$(this).fadeIn(250);
				}
			});
			var callback = $(".executar").removeClass("reset");
			$(obj).text(' '+strButtonLabel);
            $(obj).removeClass('icon-stop').addClass('icon-play2');
			$(obj).tooltip('enable');
			$('#limparTela').fadeIn(250);//css('opacity','1');
		} else {
			$('#limparTela').fadeOut(250);//css('opacity','0');
			$(obj).addClass("reset");
			// $(obj).tooltip('disable');
			$(obj).text(' Parar');
            $(obj).removeClass('icon-play2').addClass('icon-stop');
			$(".executar").each(function(){
				if (!$(this).hasClass("reset")){
					$(this).fadeOut(250);
				}
			});
            $('#sprite').addClass('anima');
            // alert('oi');
			Executar(speed, mostrarPersonagem);
		}
	}

	// EXECUTAR: LENTO
	$("body").delegate('#lento','click', function(e){
		e.preventDefault();
		if ($('#codeblocks').is(':hidden')){
			// if ($("#code").val()!="" || $(this).hasClass('reset')) {
                // alert(cm.getValue());
            if (cm.getValue()!="" || $(this).hasClass('reset')) {
				reiniciar($(this),'Lento', 25, true);
			} else {
				$("<p>Não sei o que fazer.<br>Você precisa me dizer algo...</p>").dialog({
			              autoOpen: true,
			              dialogClass: 'ui-state-error',
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
			                effect: "fade",
			                pieces: 16,
			                duration: 600
			                }
			    }).prev().addClass('ui-state-error');
				}
		} else {
			var lenWithRed = $('#codeblocks>li:not(.placeholder)').length;
			if (lenWithRed >= 1 || $(this).hasClass('reset')) {
				reiniciar($(this),'Lento', 25, true);
			} else {
				$("<p>Não sei o que fazer.<br>Você precisa me dizer algo...</p>").dialog({
		              autoOpen: true,
		              dialogClass: 'ui-state-error',
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
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-error');
			}
		}
	});
	// EXECUTAR: NORMAL
	$("body").delegate("#normal",'click',function(e){
		e.preventDefault();
		if ($('#codeblocks').is(':hidden')){
			if (cm.getValue()!="" || $(this).hasClass('reset')) {
				reiniciar($(this),'Normal', 5, false);
			} else {
			$("<p>Não sei o que fazer.<br>Você precisa me dizer algo...</p>").dialog({
		              autoOpen: true,
		              dialogClass: 'ui-state-error',
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
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-error');
			}
		} else {
			var lenWithRed = $('#codeblocks>li:not(.placeholder)').length;
			if (lenWithRed >= 1 || $(this).hasClass('reset')) {
				reiniciar($(this),'Normal', 5, false);
			} else {
				$("<p>Não sei o que fazer.<br>Você precisa me dizer algo...</p>").dialog({
		              autoOpen: true,
		              dialogClass: 'ui-state-error',
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
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-error');
			}
		}
	});
	// EXECUTAR: RÁPIDO
	$("body").delegate("#rapido",'click',function(e){
		e.preventDefault();
		if ($('#codeblocks').is(':hidden')){
			if (cm.getValue()!="" || $(this).hasClass('reset')) {
				reiniciar($(this),'Rápido', 1, false);
			} else {
			$("<p>Não sei o que fazer.<br>Você precisa me dizer algo...</p>").dialog({
		              autoOpen: true,
		              dialogClass: 'ui-state-error',
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
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-error');
			}
		} else {
			var lenWithRed = $('#codeblocks>li:not(.placeholder)').length;
			if (lenWithRed >= 1 || $(this).hasClass('reset')) {
				reiniciar($(this),'Rápido', 1, false);
			} else {
				$("<p>Não sei o que fazer.<br>Você precisa me dizer algo...</p>").dialog({
		              autoOpen: true,
		              dialogClass: 'ui-state-error',
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
		                effect: "fade",
		                pieces: 16,
		                duration: 600
		                }
		        }).prev().addClass('ui-state-error');
			}
		}
	});
	// LIMPA A TELA
	$("body").delegate("#limparTela",'click',function(e){
		sacudirTela();
	});

	// CRIA BLOCKS ITEM, ADICIONA DICAS E TORNA ARRASTÁVEL
	$( "body" ).delegate( ".blocks-item", "myCustomEvent", function( e, myName, myValue ) {
		$(this).tooltip({
	        position: {
	        my: "center bottom-20",
	        at: "center top-5",
	        using: function( position, feedback ) {
	          $( this ).css( position );
	          $( "<div>" )
	            .addClass( "arrow" )
	            .addClass( feedback.vertical )
	            .addClass( feedback.horizontal )
	            .appendTo( this );
	        }
    	}});
    	
    	$(this).draggable({
    		cursor:'move',
    		appendTo: 'body',
    		helper: 'clone'
    	});
	});
	// CRIA TOOLTIP COMPARTILHADOS ITEM
	$( "body" ).delegate( ".compartilhados-item-link", "myCustomEvent3", function( e, myName, myValue ) {
		$(this).tooltip({
	        position: {
	        my: "center bottom-20",
	        at: "center top-5",
	        using: function( position, feedback ) {
	          $( this ).css( position );
	          $( "<div>" )
	            .addClass( "arrow" )
	            .addClass( feedback.vertical )
	            .addClass( feedback.horizontal )
	            .appendTo( this );
	        }
    	}});
	});
	// CRIA TOOLTIP COMPARTILHADOS LOAD ICON
	$( "body" ).delegate( ".compartilhados-load", "myCustomEvent4", function( e, myName, myValue ) {
		$(this).tooltip({
	        position: {
	        my: "center bottom-20",
	        at: "center top-5",
	        using: function( position, feedback ) {
	          $( this ).css( position );
	          $( "<div>" )
	            .addClass( "arrow" )
	            .addClass( feedback.vertical )
	            .addClass( feedback.horizontal )
	            .appendTo( this );
	        }
    	}});
	});

	// HABILITA CODEBLOCKS COMO ARRASTÁVEL E ORGANIZÁVEL
	$('#codeblocks').droppable({
      activeClass: "ui-state-default",
      hoverClass: "ui-state-hover",
      accept: "li:not(.ui-sortable-helper)",
      drop: function( event, ui ) {
	      $( this ).find( ".placeholder" ).remove();
	      // $( "<li class='codeblocks-list-item' title='Bloco personalizado' data-code='"+ui.draggable.attr('data-code')+"'></li>" ).text( ui.draggable.attr('data-code') ).appendTo( this );
	      // $( "<span class='codeblocks-list-trash'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
      	  clicksound.playclip();
      }   
    }).sortable({
      connectWith: '.codeblocks-repeat,.codeblocks-procedimento',
      delay: 150,
      // placeholder: "blocks-placeholder",
      items: "li:not(.placeholder)",
      cursor: 'move',
      update: function() {
      	clicksound.playclip();
      },
      sort: function() {
        // gets added unintentionally by droppable interacting with sortable
        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
        $( this ).removeClass( "ui-state-default" );
    	}
	});
	

    // REMOVE BLOCO OU ATUALIZA SEU VALOR, NO CASO DE UM INPUT
	function removerBlocos(update,obj){
		if (update=="sim") {
			cm.setValue($(obj).attr('data-code'));
			$(obj).toggleClass('pulse');
		} else {
			$(obj).parent().remove();
		}
	}

	// CARREGA CÓDIGO DO BLOCO-MEMÓRIA
	$("body").delegate(".blocks-item","click",function(e){
		e.preventDefault();
		removerBlocos("sim",$(this));
	});

	// MOSTRA INTERFACE EM MODO BLOCOS
	$('body').delegate('#blocos','click',function(){
        // TEXTO BOTÃO MODO
        if ($('#codeblocks').css('display')=='block') {
            $(this).text(' PV');
            $(this).attr('title','PV');
            // cm.setValue('fw 100');
            // cm.refresh();
            // cm.focus();
            // $('body').scrollLeft = 500;
        } else {
            $(this).text(' CLI');
            $(this).attr('title','Linha de comando');
            // cm.refresh();
            
        }
		$("#oldcode").stop(true,true).slideToggle('slow');
		$(".CodeMirror").stop(true,true).slideToggle('slow', function(){
            if ($(this).css('display')=='block') {
                cm.refresh();
                cm.focus();
            }
        });
		$('#codeblocks').stop(true,true).slideToggle('slow');
		//alert($('#codeblocks').html());
	});
	
	// APAGA BLOCO MEMÓRIA
	$("body").delegate(".blocks-item-trash","click",function(e){
		e.preventDefault();
		removerBlocos('nao',$(this));
		deletesound.playclip();
	});
	
	// APAGA BLOCO DE CÓDIGO DO MODO BLOCOS
	$("body").delegate(".codeblocks-list-trash","click",function(e){
		e.preventDefault();
        if ($(this).parent().hasClass('funcao-operadores')) {
            if ($(this).parent().parent().hasClass('funcao-movimento') || $(this).parent().parent().parent().hasClass('funcao-make') || $(this).parent().parent().parent().hasClass('funcao-repeat')) {
                $(this).parent().html('<div class="numero">valor</div>');
            } else {
                 $(this).parent().remove();    
            }
        } else {
                 $(this).parent().remove();    
        }    
		
		deletesound.playclip();
	});
	
	// MARCA BLOCO DE CÓDIGO PARA EXECUÇÃO OU CONSTRUÇÃO DE NOVOS BLOCOS
	$("body").delegate(".codeblocks-list-play","click",function(e){
		e.preventDefault();
		$(this).parent().toggleClass("red");
	});
	
	// CARREGA CÓDIGO DA IMAGEM COMPARTILHADA
	$("body").delegate(".compartilhados-load","click",function(e){
		e.preventDefault();
		var fileCodeLogo = $(this).parent().find('a').attr('data-title');
		// var fileCodeBlocks = 'http://www.marciopassos.com/drafts/p7-moodle/' + $(this).parent().find('a').attr('data-cp7');
        var fileCodeBlocks = $(this).parent().find('a').attr('data-cp7');

		$("#code").load(fileCodeLogo,function(){
        	//$(this).val($(this).text());
            //alert($(this).text());
            cm.setValue($(this).text());
            cm.refresh();
            cm.focus();
        });
        // carregar em uma variável ou coisa assim, checar se tamanho > 0
        // caso seja, ai sim destroi o blocos atual e carrega os novos blocos
        //alert(fileCodeBlocks);
        //fileCodeBlocksFull = 'http://www.marciopassos.com/drafts/p7-moodle/' + fileCodeBlocks;
        $("#codeblocks").html('').load(fileCodeBlocks, function(){
			if ($(this).text().length==0) {
				$('<p>Apenas código carregado.</p>').dialog({
			      autoOpen: true,
			      title: 'Aviso',
			      closeText: 'Fechar',
			      open: function() {
			      	setTimeout($(this).dialog('close'),3000);
			      },
			      // buttons: [ { 
			      //   text: "Fechar", 
			      //   click: function() {
			      //       $(this).dialog("close");
			      //   }
			      // }],
			      modal: false,
			      show: {
			        effect: "drop",
			        direction: 'up',
			        duration: 600
			        },
			      hide: {
			        effect: "drop",
			        direction: 'down',
			        duration: 600
			        }
				}).prev().addClass('ui-state-highlight');
			} else {
				$('<p>Código e Blocos carregados!</p>').dialog({
			      autoOpen: true,
			      title: 'Aviso',
			      closeText: 'Fechar',
			      open: function() {
			      	setTimeout($(this).dialog('close'),3000);
			      },
			      // buttons: [ { 
			      //   text: "Fechar", 
			      //   click: function() {
			      //       $(this).dialog("close");
			      //   }
			      // }],
			      modal: false,
			      show: {
			        effect: "fade",
			        direction: 'up',			        
			        duration: 600
			        },
			      hide: {
			        effect: "drop",
			        direction: 'down',
			        duration: 600
			        }
				}).prev().addClass('ui-state-highlight');
				$( ".codeblocks-list-item,.codeblocks-list-trash,.codeblocks-list-play" ).trigger( "ativarDicasBlocos" );
				ativarRepeat('reload');
				ativarProcedimentos('reload');
                ativarOperadores('reload');
				//ativarVariavel('reload');
				ativarInputs();
			}
        	//console.log($(this).text().length);
        });
        $(this).parent().toggleClass('pulse','bounceIn');
	});

	// CONTROLE AJAX PARA EVITAR MÚLTIPLOS COMPARTILHAMENTOS
	var ajax;
	$("body").delegate('#like','click',function(e){
		e.preventDefault();
		var imageURL = canvas.toDataURL().replace('image/png', 'image/octet-stream');
		if (cm.getValue()!="") {
			// CANCELA AJAX CASO REQUISIÇÃO PENDENTE
			if (ajax) {
				ajax.abort();
			}
			$('#codeblocks, .codeblocks-repeat, .codeblocks-procedimento').sortable().sortable("destroy"); 
			$('div.name,div.variavel,div.numero').draggable().draggable('destroy');
			$('div.name,div.variavel,div.numero').droppable().droppable('destroy');
			$(this).fadeOut('slow',function(){
				$('#compartilhando').html(
					"Compartilhando... <img class='compartilhando-loading' src='images/bx_loader.gif' alt='imagem que mostra carregamento em andamento'>"
					).dialog({
			      autoOpen: true,
			      title: 'Aviso',
			      closeText: 'Fechar',
			      buttons: [ { 
			        text: "Fechar", 
			        click: function() {
			            $(this).dialog("close");
			        }
			      }],
			      modal: true,
			      show: {
			        effect: "fade",
			        
			        duration: 600
			        },
			      hide: {
			        effect: "fade",
			        pieces: 16,
			        duration: 600
			        }
				}).prev().addClass('ui-state-highlight');
				
				ajax = $.ajax({
			     url: 'save.php',
			     type: 'POST',
			     data: {
			        data: imageURL, 
			        conteudo_logo: cm.getValue(),
			        conteudo_cp7: $('#codeblocks').html() 
			     },
			     complete: function(data, status) {
			         if(status=='success') {
			            $('.compartilhados').find('li').remove();
			            $('.compartilhados').animate({'opacity':0}, 0, function(){
				            $.ajax({
	                            url: "listar.php",
	                            dataType: 'json',
	                            success: function(data){
	                                $.each(data[0], function(i,item) { 
	                                    if ((item!=".") && (item!="..") && (item!=".DS_Store")) {
	                         	           var fileURL = 'compartilhados/'+item;
						                   var codeURL = 'compartilhados-code/'+item.replace('.png','.txt');
						                   var codeBlocksURL = 'compartilhados-code/'+item.replace('.png','.cp7');
						                   var image = "<li class='compartilhados-item'><a rel='group1' class='grouped_elements fancyimages' href='"+fileURL+"' title='Clique para ver a figura' data-cp7='"+codeBlocksURL+"' data-title='"+codeURL+"'><img src='"+fileURL+"'></a></li>";
	                                       $('.compartilhados').append(image);
	                                       $( "<a href='#' title='Clique para carregar o código' class='compartilhados-load'></a>" ).appendTo( $('.compartilhados>li:last-of-type') );
	                                    }
	                                });
	                            }}).done(function(){
									slider.reloadSlider({
										touchEnabled: true,
				                     	minSlides: 8,
						  				maxSlides: 8,
										slideWidth: 100,
										adaptiveHeight: true,
										slideMargin: 20
									});
									// $('.codeblocks-repeat').sortable({
								 //      items: "li:not(.teste)",
								 //      cursor: 'move',
								 //      connectWith: '#codeblocks',
								 //      placeholder: "blocks-placeholder",
								 //      delay: 150,
								 //      dropOnEmpty: true,
								 //      receive: function( event, ui ) {
								 //      	$(this).find('.teste').remove();
								 //      	 //alert('recebeu:');// + ui.item.attr('data-code'));
								 //      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
									//      //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
								 //      },
								 //      sort: function() {
								 //        // gets added unintentionally by droppable interacting with sortable
								 //        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
								 //        $( this ).removeClass( "ui-state-default" );
								 //    	},
								 //      update: function() {
								 //      	clicksound.playclip();
								 //      }
									// // });
									ativarRepeat('reload');
									ativarProcedimentos('reload');
									//ativarVariavel('reload');
									ativarInputs();
									// $('.codeblocks-procedimento').sortable({
								 //      items: "li:not(#codeblocks-procedimento-placeholder)",
								 //      cursor: 'move',
								 //      connectWith: '#codeblocks',
								 //      placeholder: "blocks-placeholder",
								 //      delay: 150,
								 //      dropOnEmpty: true,
								 //      receive: function( event, ui ) {
								 //      	$(this).find('#codeblocks-procedimento-placeholder').remove();
								 //      	 //alert('recebeu:');// + ui.item.attr('data-code'));
								 //      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
									//      //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
								 //      },
								 //      sort: function() {
								 //        // gets added unintentionally by droppable interacting with sortable
								 //        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
								 //        $( this ).removeClass( "ui-state-default" );
								 //    	},
								 //      update: function() {
								 //      	clicksound.playclip();
								 //      }
									// });
									$('#codeblocks').sortable({
								      connectWith: '.codeblocks-repeat,.codeblocks-procedimento',
								      delay: 150,
								      placeholder: "blocks-placeholder",
								      items: "li:not(.placeholder)",
								      cursor: 'move',
								      update: function() {
								      	clicksound.playclip();
								      },
								      sort: function() {
								        // gets added unintentionally by droppable interacting with sortable
								        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
								        $( this ).removeClass( "ui-state-default" );
								    	}
									});		
	                        	});

	                    }).animate({'opacity':1}, 0, function(){
	                    	//alert('iu');
	                    	$("#like").fadeIn('slow');
			            	$('#compartilhando').text('Compartilhado com sucesso!');
	                    });			            
			        } else {
			        	$("#like").fadeIn('slow');
			            $('#compartilhando').text('Oops, tivemos algum problema. Tente novamente.');
			            ativarRepeat('reload');
						ativarProcedimentos('reload');
						//ativarVariavel('reload');
						ativarInputs();
			   //          $('.codeblocks-repeat').sortable({
					 //      items: "li:not(.teste)",
					 //      cursor: 'move',
					 //      connectWith: '#codeblocks',
					 //      placeholder: "blocks-placeholder",
					 //      delay: 150,
					 //      dropOnEmpty: true,
					 //      receive: function( event, ui ) {
					 //      	$(this).find('.teste').remove();
					 //      	 //alert('recebeu:');// + ui.item.attr('data-code'));
					 //      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
						//      //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
					 //      },
					 //      sort: function() {
					 //        // gets added unintentionally by droppable interacting with sortable
					 //        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
					 //        $( this ).removeClass( "ui-state-default" );
					 //    	},
					 //      update: function() {
					 //      	clicksound.playclip();
					 //      }
						// });
						// $('.codeblocks-procedimento').sortable({
					 //      items: "li:not(#codeblocks-procedimento-placeholder)",
					 //      cursor: 'move',
					 //      connectWith: '#codeblocks',
					 //      placeholder: "blocks-placeholder",
					 //      delay: 150,
					 //      dropOnEmpty: true,
					 //      receive: function( event, ui ) {
					 //      	$(this).find('#codeblocks-procedimento-placeholder').remove();
					 //      	 //alert('recebeu:');// + ui.item.attr('data-code'));
					 //      	 //$( "<li class='codeblocks-repeat-item' data-code='"+ui.item.attr('data-code')+"'></li>" ).text( ui.item.attr('data-code') ).appendTo( this );
						//      //$( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
					 //      },
					 //      sort: function() {
					 //        // gets added unintentionally by droppable interacting with sortable
					 //        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
					 //        $( this ).removeClass( "ui-state-default" );
					 //    	},
					 //      update: function() {
					 //      	clicksound.playclip();
					 //      }
						// });
						$('#codeblocks').sortable({
					      connectWith: '.codeblocks-repeat,.codeblocks-procedimento',
					      delay: 150,
					      placeholder: "blocks-placeholder",
					      items: "li:not(.placeholder)",
					      cursor: 'move',
					      update: function() {
					      	clicksound.playclip();
					      },
					      sort: function() {
					        // gets added unintentionally by droppable interacting with sortable
					        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
					        $( this ).removeClass( "ui-state-default" );
					    	}
						});		
			        }
			    }
		    	});
			});
		} else {
			$("<p>Você precisa de um código para poder compartilhar</p>").dialog({
              autoOpen: true,
              dialogClass: 'ui-state-error',
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
                effect: "fade",
                pieces: 16,
                duration: 600
                }
		    }).prev().addClass('ui-state-error');
		}
	});
});