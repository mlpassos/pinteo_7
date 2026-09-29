<?php 

    $based64Image=substr($_POST['data'], strpos($_POST['data'], ',')+1);

    $image = imagecreatefromstring(base64_decode($based64Image));

    // QUANDO IMPLEMENTADO AUTENTICAÇÃO
    // CHECAR SE TEM PASTA COMPARTILHADOS/CODIGO ALUNO
    // SE NÃO EXISTIR, CRIAR
    // ADICIONAR CODIGO ALUNO APOS /
    // SEGUIR NORMAL

    $fileName='compartilhados/';
    $file_logo='compartilhados-code/';
    $file_cp7='compartilhados-code/';

    $aluno='NomeDoAluno';

    if($image != false)
    {
        // ADICIONAR FILTRO NA VARIÁVEL CONTEÚDO PARA ARQUIVOS MALICIOSOS
        // ALGUÉM PODE TENTAR CRIAR UM ARQUIVO EXECUTAVEL E EXECUTAR, OU UM BATCH, SEI LÁ... VERIFICAR ISSO
        $fileName.=utf8_decode($aluno).'-'.date('d-m-Y'). '-' .time().'.png';
        $file_logo .= utf8_decode($aluno).'-'.date('d-m-Y'). '-' .time().'.txt';
        $file_cp7 .= utf8_decode($aluno).'-'.date('d-m-Y'). '-' .time().'.cp7';

        $conteudo_logo = $_POST['conteudo_logo']; //textarea
        $conteudo_cp7 = $_POST['conteudo_cp7'];
        file_put_contents($file_logo, $conteudo_logo);
        file_put_contents($file_cp7, $conteudo_cp7);
        if(!imagepng($image, $fileName))
        {
//          fail;
        }
    }
    else
    {
//          fail;
    }
?>