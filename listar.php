<?php

// QUANDO AUTENTICAÇÃO
// PEGAR CÓDIGO DO ALUNO E ADICIONAR AO DIRETÓRIO /
// SEGUIR NORMAL LISTANDO OS EXERCICIOS COMPARTILHADOS DO ALUNO RESPECTIVO

$dir = 'compartilhados/';
$results_array = array();

if (is_dir($dir))

{
        if ($handleDir = opendir($dir))
        {
                while(($files = readdir($handleDir)) !== FALSE)
                {
                    $results_array[] = utf8_encode($files);
                }
                closedir($handleDir);
        }
}

$return_arr = array();
array_push($return_arr,$results_array);

echo json_encode($return_arr);

?>

