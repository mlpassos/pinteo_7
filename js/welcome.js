// coded by: márcio passos/marciopassos.com
// last revision: 15-03-2014 (m-d-Y)



var availableTags = [
      "Artes",
      "Biologia",
      "Espanhol",
	  "Filosofia",
      "Física",
      "Geografia",
      "História",
      "Inglês",
      "Matemática",
      "Nenhuma",
      "Português",
      "Química"
    ];

    function split(val) {
	  return val.split( /,\s*/ );
    }

    function extractLast( term ) {
      return split( term ).pop();
    }

    function addOption(newvalue){
      if (newvalue!==''){
        // assign an id of 0 so that we know to insert into the database
        availableTags.push(newvalue.trim());
        //$('#cu').autocomplete("option", { source: availableTags }); 
        //$('#ui-id-1').fadeIn('slow');
        showAutoComplete();
      }
    }

	function showAutoComplete() {
		$("#cu").bind( "keydown", function( event ) {
		        if ( event.keyCode === $.ui.keyCode.TAB &&
		            $( this ).data( "ui-autocomplete" ).menu.active ) {
		          event.preventDefault();
		        }
		      })
		      .autocomplete({
		        minLength: 0,
		       
		        source: function( request, response ) {
		          // delegate back to autocomplete, but extract the last term
		          response( $.ui.autocomplete.filter(
		            availableTags, extractLast( request.term ) ) );
		        },
		        focus: function() {
		          // prevent value inserted on focus
		          return false;
		        },
		        change: function() {
		        	var valorCu = $('#cu').val();
		    	 	var novoCu = valorCu.substring(0,valorCu.length - 2);
		     		$('#cu').val(novoCu);
		        },
		        select: function( event, ui ) {
			        //alert(ui.item.value);
			        if ($('.form-login-disciplinasfav>li').length<=2) {
			        //alert($('.form-login-disciplinasfav>li').length);
			           	$('.form-login-disciplinasfav').append("<li class='ui-widget-header label-idade ui-corner-all form-login-conhecimentos-item'>"+ui.item.value+"</li>")
			          	$( "<a href='#' title='Remover' class='form-login-conhecimentos-item-close'></a>" ).appendTo( $('.form-login-disciplinasfav>li:last-of-type') );
			          	//alert(ui.item.value.length);
			          	for(var i = availableTags.length - 1; i >= 0; i--) {
						    if(availableTags[i].trim().localeCompare(ui.item.value.trim())==0) {
						       availableTags.splice(i, 1);
						    }
						}

	  		            var terms = split( this.value );
				        // remove the current input
				        terms.pop();
				        // add the selected item
				        terms.push( ui.item.value );
				        // add placeholder to get the comma-and-space at the end
				        terms.push( "" );
				        this.value = terms.join( ", " );
				        return false;
		      		} else {

		      			alert('Apenas 3 disciplinas, obrigado!');
		      			return false
		      		}
		        },
		        response: function(event, ui, request, response) {
		            // ui.content is the array that's about to be sent to the response callback.
		            if (ui.content.length === 0) {
		               //addOption($('#cu').val());
		               alert('termo não encontrado');
		            } 
		        }
		});
		// lista de cidades
		$('.lstEstado').on('change',function(){
			//alert();
			var codigoEstado = $(this).val();
			$.ajax({
				url: "getCidades.php",
				data: {estado:codigoEstado},
	            dataType: 'json',
	            // ajaxSend: function(){$("body").css("background-color","blue");},
	            // ajaxComplete: function(){$("#loader").hide('slow');},
				success: function(data){
                    $.each(data[0], function(i,item) { 
                    	    
                    });
	 			}
			});
		});
	}


function EscolherPerfil(perfil) {
	//$(perfil).delay(1000).removeClass('bounceIn2').addClass('fadeOutUp');
	// if (perfil=='.aluno') {
	// 	MudarIconePerfil(perfil);
	// } else {
	 	MudarIconePerfil(perfil);
	//}

	// TODO: Renomear corretamente de acordo com a semantica da interface
	
	// cadastro aluno
	$( ".form-login" ).dialog({
		autoOpen: false,
		title: 'Conte mais sobre você...',
		closeText: 'Fechar',
		open: showAutoComplete(),
		buttons:[{
			text: "Começar!",
			icons: {
			     	primary: "ui-icon-circle-check"
			       }, 
			click: function() { 
				$( this ).dialog( "close" );
				$('html').load('index.html');
				// $('#idade').unbind('change');
				// $('#valorIdade, #idade').val('0');
			}}, 
			{
			text: "Fechar",
			icons: {
			       	primary: "ui-icon-circle-close"
				   },
			click: function() { 
				$( this ).dialog( "close" ); 
				$('#idade').unbind('change');
				$('#valorIdade, #idade').val('0');
				$('#lstEstado, #lstCidade').val('');

			}
			}],
		width: 800,
		height: 'auto',
		modal: false,
		show: {
		    effect: "drop",
		    // pieces:24,
			duration: 600
      	},
	  hide: {
	        effect: "fade",
	        // pieces:24,
	        duration: 600
    	}
	});
	// cadastro professor
	$( ".form-login-professor" ).dialog({
		autoOpen: false,
		title: 'Conte mais sobre você...',
		closeText: 'Fechar',
		buttons:[{
			text: "Começar!",
			icons: {
			     	primary: "ui-icon-circle-check"
			       }, 
			click: function() { 
				$( this ).dialog( "close" );
				$('html').load('index.html');
				// $('#idade').unbind('change');
				// $('#valorIdade, #idade').val('0');
			}}, 
			{
			text: "Fechar",
			icons: {
			       	primary: "ui-icon-circle-close"
				   },
			click: function() { 
				$( this ).dialog( "close" ); 
				// $('#idade').unbind('change');
				// $('#valorIdade, #idade').val('0');
				// $('#lstEstado, #lstCidade').val('');

			}
			}],
		width: 800,
		height: 400,
		modal: false,
		show: {
		    effect: "drop",
		    // pieces:24,
			duration: 600
      	},
	  hide: {
	        effect: "fade",
	        // pieces:24,
	        duration: 600
    	}
	});
	// formulário de login
	$( ".dialog-cadastro" ).dialog({
		autoOpen: false,
		title: 'Login',
		closeText: 'Fechar',
		buttons:[{
			text: "Entrar",
			icons: {
			     	primary: "ui-icon-circle-check"
			       }, 
			click: function() { 
				// 	AUTENTICAR VIA AJAX
				$( this ).dialog("close");
				// $( "body" ).delegate(".ajaxloading", "ajaxStart", function() {
			 //  		$( "#loader" ).show('slow');
				// });
				// $( document ).ajaxComplete(function() {
  		// 			$( "#loader" ).hide();
				// });
				
				$('.wrapper').delay(300).html('LOADING...').animate({'opacity':0}, 300, function(){
					$(this).load('wrapper.html', function(){
					}).animate({'opacity':1},300);
				});
				$('#header').delay(900).animate({'opacity':0},300,function(){
					$(this).load('header.html', function(){
						MudarIconePerfil('.aluno');
						
					}).animate({'opacity':1},300);
				});
				$('.footer').delay(1500).animate({'opacity':0}, 300, function(){
					$(this).load('footer.html', function(){
									// 	PEGAR CÓDIGO ALUNO AUTENTICADO E PASSAR
									//  RECEBER A LISTA DE EXERCÍCIOS COMPARTILHADOS DO ALUNO E SEGUIR NORMALMENTE...
									//  TODO: ALTERAR listar.php QUANDO AUTENTICAÇÃO IMPLEMENTADA
									$.ajax({
										url: "listar.php",
							            dataType: 'json',
							            // ajaxSend: function(){$("body").css("background-color","blue");},
							            // ajaxComplete: function(){$("#loader").hide('slow');},
										success: function(data,callback){
						                    $.each(data[0], function(i,item) { 
						                        if ((item!=".") && (item!="..") && (item!=".DS_Store")) {
							                        //alert(data);
							                        var fileURL = 'compartilhados/'+item;
						                            var codeURL = 'compartilhados-code/'+item.replace('.png','.txt');
							                        var image = "<li class='compartilhados-item'><a rel='group1' class='compartilhados-item-link grouped_elements fancyimages' href='"+fileURL+"' title='Clique para ver a figura' data-title='"+codeURL+"'><img src='"+fileURL+"'></a></li>";
							                        //alert(fileURL);
							                        $('.compartilhados').append(image);
							                        $( "<a href='#' title='Clique para carregar o código' class='compartilhados-load'></a>" ).appendTo( $('.compartilhados>li:last-of-type') );
							                        $('.compartilhados-item-link').trigger('myCustomEvent3');
							                        $('.compartilhados-load').trigger('myCustomEvent4');
						                        }
						                    });
							 			}
									}).done(function(){
										var slider = $('.compartilhados').bxSlider({
											touchEnabled: true,
					                    	minSlides: 10,
							  				maxSlides: 10,
											slideWidth: 100,
											adaptiveHeight: true,
											slideMargin: 20
										});
									});
									init('canvas','turtle','input','oldcode', 'textOutput'); clearcanvas(); //run(1,false);
									$('#codeblocks').droppable({
								      activeClass: "ui-state-default",
								      hoverClass: "ui-state-hover",
								      accept: ":not(.ui-sortable-helper)",
								      drop: function( event, ui ) {
								        
								        // CORES ALEATÓRIAS PARA OS BLOCOS
								        // var r = Math.floor((Math.random() * 255)+1);
								        // var g = Math.floor((Math.random() * 200)+1);
								        // var b = Math.floor((Math.random() * 192)+1);
								        // style='background-color:rgb("+r+','+g+','+b+")'
								        
								        $( this ).find( ".placeholder" ).remove();
								        $( "<li class='codeblocks-list-item' data-code='"+ui.draggable.attr('data-code')+"'></li>" ).text( ui.draggable.attr('data-code') ).appendTo( this );
								        $( "<span class='codeblocks-list-trash'></span><span class='codeblocks-list-play'></span>" ).appendTo( $(this).find('.codeblocks-list-item:last-of-type') );
								      }   
								    }).sortable({
								      items: "li:not(.placeholder)",
								      cursor: 'move',
								      sort: function() {
								        // gets added unintentionally by droppable interacting with sortable
								        // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
								        $( this ).removeClass( "ui-state-default" );
								    	}
									});
									$('.help').load('help.html');
									$( "a:not(a.reset),input,.list-prog" ).trigger( "myCustomEvent2" );
								}).animate({'opacity':1},300);
				});
						//.css('margin-top','150px');
			}
				

				// var url = "js/pinteo7.js";
				// $.getScript( url, function(textStatus) {
				// 	alert(textStatus);
				// });
				// $('#idade').unbind('change');
				// $('#valorIdade, #idade').val('0');
			}, 
			{
			text: "Não sou cadastrado",
			icons: {
			       	primary: "ui-icon-circle-close"
				   },
			click: function() { 
				$( this ).dialog( "close" );
				// ABRIR A JANELA DO CADASTRO DE ACORDO COM ALUNO OU PROFESSOR (perfil)
				//alert(perfil);
				if (perfil=='.aluno') {
					$(".form-login").dialog('open');
					$('#idade').on('change',function(){
						var idade = $('#idade').val();
						// $('#valorIdade + span').text(idade).hide().fadeIn(275);
						$('#valorIdade').val(idade);
					});
				} else {
					$(".form-login-professor").dialog('open');
				}
			}
			}],
		width: 400,
		height: 'auto',
		modal: false,
		show: {
		    effect: "fade",
		    // pieces:24,
			duration: 600
      	},
	 	 hide: {
	        effect: "fade",
	        // pieces:24,
	        duration: 600
    	}
	});
	// abre o formulário de login e guia o usuário de acordo com a escolha: autenticar/cadastro
	$( ".dialog-cadastro" ).dialog('open');
	
	// $('.form-login').stop(true,true).delay(900).slideToggle('slow',function(){
	// 	$('.site-logo img').click(function(){
	// 		$('.form-login').stop(true,true).slideToggle('slow', function(){
	// 			$('.wrapper').animate({'opacity':'0'},100,function(){
	// 				$('.wrapper').load('welcome.html .wrapper').animate({'opacity':'1'});
	// 				$('.site-logo img').unbind('click');
	// 				$('.site-logo img').attr('src','http://placehold.it/44x44');//.css({'width':'44px','height':'44px'}).hide().fadeIn('slow');
	// 				$("body").on('click','.professor',function(){
	// 					EscolherPerfil('.professor');
	// 				});
	// 				$("body").on('click','.aluno',function(){
	// 					EscolherPerfil('.aluno');
	// 				});

	// 			});

	// 		});
	// 	});
	// });
}

function MudarIconePerfil(perfil) {
	if (perfil=='.aluno') {
		$('.site-logo img').attr('src','images/icon-aluno.png').css({'width':'44px','height':'44px'}).hide().fadeIn('slow');
		 $('.professor').removeClass('bounceIn2').css('opacity','1');//.addClass('fadeOutUp');
	} else {
		$('.site-logo img').attr('src','images/icon-professor.png').css({'width':'44px','height':'44px'}).hide().fadeIn('slow');
		 $('.aluno').removeClass('bounceIn2').css('opacity','1');//.addClass('fadeOutUp');	
	}
}

$(document).ready(function(){
	$('body').delegate(".form-login-conhecimentos-item-close",'click',function(){
		var element = $(this).parent();
		var valorCu = $('#cu').val().split(',');
		//var novoCu = valorCu.replace(element.text(),"");
		for(var i = valorCu.length - 1; i >= 0; i--) {
				//alert(valorCu[i].trim().length+valorCu[i].trim()+ ' - ' + valorCu[i].trim().localeCompare(element.text().trim()) + ' - ' + element.text().trim() + element.text().trim().length);
				//alert();
			    if(valorCu[i].trim().localeCompare(element.text().trim())==0) {
			       //alert(valorCu[i]);
			       valorCu.splice(i, 1);

			    }
		}
		//var novoCu = valorCu;
		availableTags.push(element.text().trim());
		availableTags.sort();
		element.remove();
		$("#cu").val(valorCu);//.substring(1,valorCu.length));//novoCu.substring(0,novoCu.length));
	});

    // $('#cu').bind('focusout', function(){
    // 	var valorCu = $('#cu').val();
    // 	var novoCu = valorCu.substring(0,valorCu.length - 2);
    // 	$('#cu').val(novoCu);
    // });

	$('.aluno').click(function(){
		EscolherPerfil('.aluno');
	});
	$('.professor').click(function(){
		EscolherPerfil('.professor');
	});
});