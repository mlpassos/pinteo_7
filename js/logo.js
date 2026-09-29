// $Id: logo.js 134 2009-05-02 17:30:15Z thomas.figg $


function Logo () {
    this.turtle = null;
    this.textOutput = null;
    
    this.setTurtle = function(turtle) {
        this.turtle = turtle;
    }
    this.setTextOutput = function(textOutput) {
        this.textOutput = textOutput;
    }
    var d = new Date()
    this.seed = d.getTime()/1000;
    
    this.functions = new SymbolTable();
    this.values = new SymbolTable();
    
    this.t = new Tokenizer();
    this.p = new Parser();
    
    this.primitive = new Array();
    this.command = new Array();
    this.turtle_command = new Array();
    this.constant = new Array();
    
    this.alias = new Array();

    this.repcount = -1;
    this.setup();
    this.depth = 0;
    this.maxdepth = 200;
}

Logo.prototype.random = function () {
    this.seed = (this.seed * 214013 + 2531011)%4294967296;
    return ((this.seed >> 16) & 0x7fff) / 32768.0;
}

Logo.prototype.srand = function(seed) {
    this.seed = seed;
}

Logo.prototype.addAlias = function (name, wrd) {
    this.alias[name] = wrd;
}

Logo.prototype.addConstant = function(name, value) {
    this.constant[name] = value;
};

Logo.prototype.addCommand   = function(name, grab, aliases, fun) {
    this.command[name] = fun
    this.addBuiltin(name, grab,aliases);
};

Logo.prototype.addPrimitive = function(name, grab, aliases, fun) {
    this.primitive[name] = fun
    this.addBuiltin(name, grab,aliases);
};

Logo.prototype.addInfix = function(name, fun, p) {
    this.addAlias(name, fun);
    this.p.addInfix(name,p);
}

Logo.prototype.addTurtleCommand = function(name, grab, aliases) {
    this.turtle_command[name] = grab;
    this.addBuiltin(name, grab,aliases);
};

Logo.prototype.addBuiltin = function(name,grab,aliases) {
    this.p.addCommand(name, grab);
    if (aliases != null && aliases.length) {
        for (var a in aliases) {
            this.addAlias(aliases[a],name);
            this.p.addCommand(aliases[a], grab);
        }
    }
}

Logo.prototype.setup = function () {

    this.addCommand('forward',1,['fw','fd'], function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Forward precisa de um número, não '+a[0])
        this.turtle.forward(parseFloat(a[0]));
    });
    
    this.addCommand('backward',1,['bw','bk','back'], function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Backward precisa de número, não '+a[0])
        this.turtle.backward(parseFloat(a[0]));
    });
    this.addCommand('right',1,['rt'], function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Right precisa de um número de graus a girar, não '+a[0])
        this.turtle.right(a[0]);
    });
    this.addCommand('left',1,['lt'], function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Left precisa de um número de graus a girar, não  '+a[0])
        this.turtle.left(a[0]);
    });

    this.addCommand('setx',1,null, function (a) { 
        if (parseInt(a[0]) != a[0]) return new Token('error','Setx precisa de um número inteiro para a posição, não '+a[0])
        this.turtle.setx(a[0]);
    });

    this.addCommand('sety',1,null, function (a) { 
        if (parseInt(a[0]) != a[0]) return new Token('error','Sety precisa de um número inteiro para a posição, não '+a[0])
        this.turtle.sety(a[0]);
    });
    
    this.addCommand('setheading',1,['seth'], function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Setheading precisa de um número inteiro para a posição, não '+a[0])
        this.turtle.setheading(a[0]);
    });

    this.addCommand('setxy',2,null, function (a) { 
        if (parseInt(a[0]) != a[0]) return new Token('error','Setxy, precisa de um número inteiro para a posição x, não '+a[0])
        if (parseInt(a[1]) != a[1]) return new Token('error','Setxy, precisa de um número inteiro para a posição y, não '+a[1])
        this.turtle.setxy(a[0],a[1]);
    });

    this.addCommand('setpos',1,null, function (b) { 
        if (b && b.length == 1 && b[0].length == 2 ) {
			var a = b[0];
            if (parseInt(a[0]) != a[0]) return new Token('error','Setpos, precisa de um número inteiro para a posição x, não '+a[0])
            if (parseInt(a[1]) != a[1]) return new Token('error','Setpos, precisa de um número inteiro para a posição y, não '+a[1])
            this.turtle.setxy(a[0],a[1]);
        } else {
            return new Token('error','Setpos precisa de uma lista com duas informacões [ x y ], não '+b[0]);
        }
    });

	this.addCommand('print',1,['pr'], function (b) { 
        if (b && b.length) {
		   var a, sep;
		   if (b[0].constructor == Array) {
				a = b[0];
				sep = " ";
		   } else {
				a = b;
				sep = '';
		   }
		   var txt = "";
		   for (var i=0; (i < a.length); i++) txt += a[i] + sep;
		   this.textOutput.innerHTML = this.textOutput.innerHTML + "<div>" + txt + "</div>";
        } else {
            return new Token('error','Print precisa de uma lista de informações ou de uma palavra, não '+b[0]);
        }
    });
	
	this.addCommand('cleartext', 0, ['ct'], function () { 
        this.textOutput.innerHTML = "";        
    });


    this.addCommand('arc',2,null, function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Arc precisa de um número inteiro para o raio, não  '+a[0])
        if (parseFloat(a[1]) != a[1]) return new Token('error','Arc precisa de um número inteiro para o ângulo, não  '+a[1])
        this.turtle.arc(a[0],a[1]);
    });
    
    this.addCommand('circle',1,null, function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Circle precisa de um número inteiro para o raio, não  '+a[0])

        this.turtle.circle(a[0]);
    });
    
    this.addTurtleCommand('penup',0,['pu']);
    this.addTurtleCommand('pendown',0,['pd']);
    this.addTurtleCommand('home',0,null);
    this.addTurtleCommand('undo',0,null);
    this.addTurtleCommand('redo',0,null);
    
    
    
    this.addCommand('color',1,['colour'], function (a) { 
        if (a[0].length != 3 ) return new Token('error','Color precisa de uma lista tipo [r g b], não '+a[0])

        this.turtle.color(a[0]);
    });
    
    this.addCommand('penwidth',1,['setpensize'], function (a) { 
        if (parseFloat(a[0]) != a[0]) return new Token('error','Pen width pecisa de um número, não '+a[0])
        this.turtle.penwidth(a[0]);
    });
    
    this.addTurtleCommand('hideturtle',0,['ht']);
    this.addTurtleCommand('showturtle',0,['st']);

    this.addTurtleCommand('clearscreen',0,['cs','clear']);
    this.addTurtleCommand('clean',0,null);
    
    this.addTurtleCommand('reset',0,null);


    this.addCommand('first',1,['head'],function (a) {return a[0][0];});
    this.addCommand('last',1,null,function (a) {var b = a[0]; return b[b.length];});

    this.addCommand('butfirst',1,['tail','bf'],function (a) {return a[0].slice(1);});
    this.addCommand('butlast',1,['bl'],function (a) {var b = a[0]; return b.slice(0,b.length-1);});
    this.addCommand('item',2,null,function (a) {var b = a[1]; return b[a[0]];});
    this.addCommand('setitem',3,null,function (a) {var b = a[1]; b[a[0]]= a[2];});

    this.addCommand('empty?',1,['emptyp'],function (a) {return a[0].length == 0});

    this.addCommand('fput',2,null,function (a) {var b = a[1]; return [a[0]].concat(b.slice(0));});
    this.addCommand('lput',2,null,function (a) {var b = a[1]; return b.slice(0).concat(a[0]);});

    this.addCommand('int',1,null,function (a) {return Math.floor(a[0])});
    this.addCommand('round',1,null,function (a) {return Math.round(a[0])});
    this.addCommand('sqrt',1,null,function (a) {return Math.sqrt(a[0])});
    this.addCommand('power',2,['pow'],function (a) {return Math.pow(a[0],a[1])});
    this.addCommand('exp',1,null,function (a) {return Math.exp(a[0])});
    this.addCommand('ln',1,null,function (a) {return Math.log(a[0])});
    this.addCommand('log10',1,null,function (a) {return Math.LOG10E * Math.log(a[0])});
    this.addCommand('sin',1,null,function (a) {return Math.sin(a[0]/180*Math.PI)});
    this.addCommand('cos',1,null,function (a) {return Math.cos(a[0]/180*Math.PI)});
    this.addCommand('arctan',1,null,function (a) {return Math.atan(a[0])*180/Math.PI});
    this.addCommand('radsin',1,null,function (a) {return Math.sin(a[0])});
    this.addCommand('radcos',1,null,function (a) {return Math.cos(a[0])});
    this.addCommand('radarctan',1,null,function (a) {return Math.atan(a[0])});

    this.addCommand('random',1,['rand'],function (a) {var b= Math.floor(this.random()*a[0]); return b;});
    this.addCommand('rerandom',1,['srand'],function (a) {return this.srand(a[0])});
    
    this.addCommand('bitand',2,null,function (a) {var sum = 1; for (var i in a) {sum=sum&a[i]}; return sum;});
    this.addCommand('bitor',2,null,function (a) {var sum = 0; for (var i in a) {sum=sum|a[i]}; return sum;});
    this.addCommand('bitxor',2,null,function (a) {var sum = 0; for (var i in a) {sum=sum|a[i]}; return sum;});
    this.addCommand('bitnot',1,null,function (a) { return  ~a[0]});
    
    this.addCommand('sum',2,['add'],function (a) {var sum = 0; for (var i in a) {sum+=a[i]}; return sum;});
    this.addCommand('difference',2,['sub'],function (a) {return a[0]-a[1]});
    this.addCommand('product',2,['mul'],function (a) {var product = 1; for (var i in a) {product*=a[i]}; return product;});
    this.addCommand('divide',2,['div'],function (a) {return a[0]/a[1]});
    this.addCommand('modulo',2,['mod','remainder'],function (a) {return a[0]%a[1]});
    this.addCommand('minus',1,null,function (a) {return -a[0]});

    this.addCommand('output',1,['op'],function (a) {return new Token('stop',a[0])});

    this.addInfix('+','sum',40);
    this.addInfix('-','difference',40);
    this.addInfix('*','product',20);
    this.addInfix('/','divide',20);
    this.addInfix('%','modulo',10);
    
    
    this.addCommand('or',2,null,function (a) {return a[0] || a[1]});
    this.addCommand('and',2,null,function (a) {return a[0] && a[1]});
    this.addCommand('not',1,null,function (a) {return !a[0]});

    this.addCommand('equal?',2,['equalp'],function (a) {return a[0] == a[1]});
    this.addCommand('notequal?',2,['notequalp'],function (a) {return a[0] != a[1]});
    this.addCommand('less?',2,['lessp'],function (a) {return a[0] < a[1]});
    this.addCommand('greater?',2,['greaterp'],function (a) {return a[0] > a[1]});

    this.addCommand('greaterequal?',2,['greaterequalp'],function (a) {return a[0] >= a[1]});
    this.addCommand('lessequal?',2,['greaterequalp'],function (a) {return a[0] <= a[1]});

    this.addInfix('=','equal?',60);
    this.addInfix('!=','notequal?',60);
    this.addInfix('<>','notequal?',60);
    this.addInfix('<','less?',60);
    this.addInfix('>','greater?',60);
    this.addInfix('<=','lessequal?',60);
    this.addInfix('>=','greaterequal?',60);

    this.addConstant('stop',new Token('stop',null));


    this.addCommand('array',1,null,function (a) {
        var list = new Array(a[0]);
        for (var i in list) {
            list[i] = 0;
        }
        return list;
    });
    
    this.addCommand('make',2,null,function (args) {
        //alert(args);
        if (args && args.length == 2) {
            if (args[0]) {
                var name = args[0]
                var value = args[1];
                if (value == null) return new Token('error','Não posso fazer de '+name+' null');
        
                //alert("make "+name+" "+value);
                this.values.set(name,value);
            } else {
                return new Token('error','Não posso make - '+args[0]+' não é um símbolo');
            }
        } else {
            return new Token('error','Não posso make, preciso de duas informacões');
        }
    });
    
    this.addCommand('global',1,null,function (args) {
        //alert(args);
        if (args) {
            for (var i in args) {
                this.values.make_global(args[i]);
            } 
        } else {
            return new Token('error','Não posso make '+args+ 'global');
        }
    });
    
   
    this.addPrimitive('forever',1,null,function (args) {
            if (args && args.length == 1) { 
                var cmd = args[0];
                while(true) { 
                    var res = this.eval(cmd);
                    if (res && res.type == "error") return res;
                    if (res && res.type == "stop") return res;
                }
            } else {
                return new Token ('error','Não posso forever.');
            }
        
        }
    );

    this.addPrimitive('do.until',2,null,function (args) {
            if (args && args.length == 2) { 
                var cmd = args[1];
                while (true) {
                    var res = this.eval(cmd);
                    if (res && res.type == "error") return res;
                    if (res && res.type == "stop") return res;

                    var limit = this.eval(args[0]);
                    if (limit == null) return new Token('error','Não sei qual a condição do while.');
                    if (limit && limit.type == "error") return limit;
                    if (limit) return;
                }
            } else {
                return new Token ('error','Não posso repeat.');
            }
        
        }
    );


    this.addPrimitive('do.while',2,null,function (args) {
            if (args && args.length == 2) { 
                var cmd = args[1];
                while (true) {
                    var res = this.eval(cmd);
                    if (res && res.type == "error") return res;
                    if (res && res.type == "stop") return res;

                    var limit = this.eval(args[0]);
                    if (limit == null) return new Token('error','Não sei qual a condição do while.');
                    if (limit && limit.type == "error") return limit;
                    if (!limit) return;
                }
            } else {
                return new Token ('error','Não posso repeat.');
            }
        
        }
    );

    this.addPrimitive('until',2,null,function (args) {
            if (args && args.length == 2) { 
                var cmd = args[1];
                while (true) {
                    var limit = this.eval(args[0]);
                    if (limit == null) return new Token('error','Não sei qual a condição do while.');
                    if (limit && limit.type == "error") return limit;
                    if (limit) return;
                
                    var res = this.eval(cmd);
                    if (res && res.type == "error") return res;
                    if (res && res.type == "stop") return res;
                }
            } else {
                return new Token ('error','Não posso repeat.');
            }
        
        }
    );
    this.addPrimitive('while',2,null,function (args) {
            if (args && args.length == 2) { 
                var cmd = args[1];
                while (true) {
                    var limit = this.eval(args[0]);
                    if (limit == null) return new Token('error','Não sei qual a condição do while.');
                    if (limit && limit.type == "error") return limit;
                    if (!limit) return;
                
                    var res = this.eval(cmd);
                    if (res && res.type == "error") return res;
                    if (res && res.type == "stop") return res;
                }
            } else {
                return new Token ('error','Não posso repeat.');
            }
        
        }
    );

    this.addPrimitive('repeat',2,null,function (args) {
            if (args && args.length == 2) { 
                var limit = this.eval(args[0]);
                if (limit == null) return new Token('error','Não sei quantas vezes repetir.');
                if (limit && limit.type == "error") return limit;
                if (limit != parseInt(limit)) return new Token('error','Eu só posso repeat para um número inteiro de vezes, e '+ limit+' não é um número inteiro.');
                
                var cmd = args[1];
                for (var c = 0; c< limit; c++) {
                    var res = this.eval(cmd);
                    if (res && res.type == "error") return res;
                    if (res && res.type == "stop") return res;
                }
            } else {
                return new Token ('error','Não posso repeat.');
            }
        
        }
    );
    
    this.addPrimitive('if',2,null,function (args) {
            if (args && args.length == 2) { 
                var cond = this.eval(args[0]);
                if (cond && cond.type == "error") return cond;
                if (cond == null) return new Token('error','If precisa de uma condição, algo que é ou verdadeiro ou falso. O que você está executando retorna null.');

                if (cond) {
                    return this.eval(args[1]);
                }
            } else {
                return new Token ('error','Não posso if');
            }
        
        }
    );
    
    
    this.addPrimitive('ifelse',3,null,function (args) {
            if (args && args.length == 3) { 
                var cond = this.eval(args[0]);
                if (cond && cond.type == "error") return cond;
                if (cond == null) return new Token('error','If precisa de uma condição, algo que é ou verdadeiro ou falso. O que você está executando retorna null.');

                if (cond) {
                    return this.eval(args[1]);
                } else {
                    return this.eval(args[2]);
                }
            } else {
                return new Token ('error','Não posso if.');
            }
        
        }
    );
        

    this.addConstant('true',true);
    this.addConstant('false',false);
    
}


Logo.prototype.run = function (code) {
    var js = new Array();
   
    this.t.load(code);
    this.p.load(this.t); 
    
    var i = null;
    
    this.turtle.start();
    
    var ret = null;
    do {
        i = this.p.next();
        if (i == null) { ret =new Token('error','Não consigo entender isto.'); break;}
        if (i.type == "error") {ret = i; break;}
        if (i.type == "eof") break;
        
        var out = this.eval(i);
        if (out && out.type == "error") {ret = out; break;}
        
    } while (1);
    
    this.turtle.finish();
    return ret;
}

Logo.prototype.eval = function (code) {
    //alert("evaling "+code.type);
    if (code == null) {
        return null;
    } else if (code.type == "def") {        // a definition: to ....
        this.functions.set(code.data,code.args);
        //alert(code.args.args.length);
    } else if (code.type == "lst") {        // a list of items
        //alert('evaling list');
        return this.eval_list(code.args);
    } else if (code.type == "wrd" || code.type=="ops") {        // a command
        if (this.alias[code.data] != null) {
            code.data = this.alias[code.data];
        }
        
        if (this.constant[code.data] != null) {    // a constant

            return this.constant[code.data];
            
        } else if (this.primitive[code.data] != null) {    // an primitive operation, don't eval args
            var f = this.primitive[code.data];
            var l = code.args;
            
            if (l && l.type == 'error') return l;
            
            var result = f.call(this,l);
            
            return result;
        } else if (this.command[code.data] != null) {    // an command operation, eval args.
            var f = this.command[code.data];
            var l = this.eval_list(code.args);
            
            if (l && l.type == 'error') return l;
            
            var result = f.call(this,l);
            
            return result;
        
        } else if (this.turtle_command[code.data] != null) {  // a turtle command, eval and pass to the turtle.

            // it's a builtin
            var f = this.turtle[code.data];
            var l = this.eval_list(code.args);
            if (l && l.type == 'error') return l;
            f.apply(this.turtle,l);
            return null;
        
        } else if (this.functions.get(code.data) != null) { // a user defined function

            var f = this.functions.get(code.data);
            
            if (f.code == null) { // time for some runparsing
                //alert("runparsing "+code.data);
                var t = new ListTokenizer(f.raw);
                this.p.load(t);
                
                var l = new Array();
                do {
                    var i = this.p.next();
                    //alert("parsed "+i);
                    if (i == null) { ret =new Token('error','Não consigo entender esta funcão '+code.data); break;}
                    if (i.type == "error") {return i}
                    if (i.type == "eof") break;
                    

                    l.push(i);
                    
                } while (1);
                
                //alert(l);
                this.p.load(this.t);
            
                f.code = l;
            }
            var last = f.code[f.code.length-1];
            var newvalues = new SymbolTable(this.values);

            if (code.args == null && f.args.length > 0) {
                return new Token('error',code.data+" only takes "+f.args.length+" informações, você não forneceu nenhuma");
            }
            if (code.args != null && code.args.length != f.args.length) {
                return new Token('error',code.data+" only takes "+f.args.length+" informações, você forneceu "+code.args.length);
            }
            for (var c  in code.args) {
                var name = f.args[c].data;
                var value = this.eval(code.args[c]);
                if (value == null) return new Token('error','Não posso passar um valor null para '+code.data);
                if (value && value.type == 'error') return value;

                //alert("call "+code.data+" setting: "+name +":" +value);
                newvalues.set(name,value);

            }
            // running function
            
            if (this.depth > this.maxdepth) {
                return new Token('error', 'Recursão demais =]');
            }

            if (last.type == "wrd" && last.data == code.data) {
                
                var par = this.values;
                
                var tail = f.code.pop();
                rec_depth = this.depth;
                while (1) { // revursive
                    if (this.depth > this.maxdepth) {
                        this.values = par; // restore the original stack
                        f.code.push(tail); // restore the original tail.
                        this.depth=rec_depth;
                        return new Token('error', 'Recursão demais =]');
                    }

                    this.depth++;
                    this.values = newvalues;
                    var result = this.eval_list(f.code);

                    if (result && (result.type == "stop" || result.type == "error")) {
                        this.values = par; // restore the original stack
                        f.code.push(tail); // restore the original tail.
                        this.depth=rec_depth;
                        return result.data;
                    };
                    
                    newvalues = new SymbolTable(par);
                    
                    for (var c in code.args) {
                        var name = f.args[c].data;
                        var value = this.eval(tail.args[c]);
                        if (value == null) return new Token('error','Não posso passar um valor null para '+code.data);
                        if (value && value.type == 'error') return value;
    
                        //alert("rec: "+code.data+" setting: "+name +":" +value);
                        newvalues.set(name,value);
                    }
            
                }
            } else {
                this.values = newvalues;
                this.depth++; 
                var result = this.eval_list(f.code);
                //alert(result);
                this.depth--;
                if (result && result.type == "stop") { result = result.data };

                this.values = this.values.par;
                return result
            }
        } else {
            return new Token('error','Oops, eu não sei como ' + code.data);
        }
    } else if (code.type == "var") {        // a variable
        var r = this.values.get(code.data);
        //alert("getting:" + code.data + ":"+ r);
        return r;
        
    } else if (code.type == "num" || code.type == "sym") { // a number / symbol
        return code.data;
    } else {
        return new Token ('error', 'Eu não sei como interpretar '+code.data); 
    }
}

Logo.prototype.eval_list = function(args) {
    if (args == null) { return null;}
    var ret = new Array()
    for (var i = 0; i < args.length; i++) {
        //alert(args[i]);
        var res = this.eval(args[i]);
        if (res && res.type == "error") {
            return res;
        } else if (res  && res.type== "stop") {
            return res
        } else {
            ret.push(res);
        }
    }
    return ret;
}
    

function SymbolTable (par) {
    this.par = par;
    this.table = new Array();
    this.globalsyms = new Array();
    
    if (par != null && par.globaltable != null) {
        this.globaltable = par.globaltable;
    } else {
        this.globaltable = par;
    }
}

SymbolTable.prototype.make_global = function (key) {
    this.globalsyms["_"+key] = true
}

SymbolTable.prototype.get = function (key) {
    var mkey = "_"+key;
    var r = null;
    if (this.globalsyms[mkey] != null) {
        r = this.globaltable.get(key);
    } else {
        var r = this.table[mkey];
        if (r == null && this.par != null) {
            r = this.par.get(key);
        }
    }
    //alert("getting "+key+" = "+r);
    return r;
}


SymbolTable.prototype.set = function (key,value) {
    var mkey = "_" + key;
    if (this.globalsyms[mkey] != null) {
        //alert("global set");
        this.globaltable.set(key,value);
    } else {
        //alert("setting "+key+":"+value);
        this.table[mkey] = value;
    } 
}
