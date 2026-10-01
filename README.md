# Portfólio — Guilherme Luiz Silva Edmundo

Site completo em HTML, CSS e JavaScript, sem framework. O layout segue a composição de Zubayer, com apresentação à esquerda, retrato à direita, fundo texturizado e menu vertical fixo na lateral esquerda. A navegação permanece lateral no celular e permite rolagem interna em telas baixas. Abra `index.html` no navegador ou, para servir localmente, execute `npm start` e acesse http://127.0.0.1:4173.

## Preencher os dados

Edite **assets/js/config.js**. Nome, apresentação, formação, fotos, favicon, redes sociais, contatos, formulário e projetos ficam centralizados nesse arquivo. Campos vazios mostram “Em breve” e não geram links provisórios.

- **Fotos:** adicione `assets/images/guilherme-home.webp` e `assets/images/guilherme-about.webp`. Para usar JPG, PNG ou outra extensão, altere os caminhos em `photos`. Use `position` para ajustar o enquadramento.
- **Favicon:** o arquivo existente `imgs/favicon-gl.png` foi copiado para `assets/images/favicon-gl.png`. A navegação e o ícone da aba usam o campo `favicon`.
- **Contatos:** preencha URLs completas em `links.github` e `links.linkedin`, o endereço em `links.email` e o número com país e DDD em `links.whatsapp`.
- **Educação:** `education.course` e `education.startDate` são opcionais e aparecem somente quando preenchidos.
- **Projetos:** edite os projetos cadastrados e substitua os registros provisórios, acrescente ou remova objetos em `projects`. Preencha `title`, `description`, `repository`, `demo` e `images`. Mude `provisional` para `false` após cadastrar um projeto real. Nunca deduza a URL de demonstração.

Exemplo de capturas (os controles surgem automaticamente quando há duas ou mais):

```js
images: [
  { src: "assets/images/projeto-01-home.webp", alt: "Página inicial do projeto" },
  { src: "assets/images/projeto-01-mobile.webp", alt: "Versão para celular" },
],
```

## Integrar o formulário

O envio está desabilitado enquanto `form.endpoint` e `form.send` estiverem vazios. A validação dos campos já está preparada. Nenhuma mensagem é enviada ou simulada na configuração inicial.

Para integrar um serviço próprio, use uma URL HTTPS em `form.endpoint`. O site envia JSON por POST com `name`, `email` e `message`; o serviço deve autorizar CORS para o domínio do portfólio e responder com status 2xx e `{ "success": true }` somente após confirmar o recebimento. Não coloque credenciais secretas no JavaScript público.

Como alternativa, implemente `form.send` como uma função assíncrona que chama seu serviço e retorna `true` ou `{ success: true }` somente após o envio real. Falhas devem lançar erro ou retornar `{ success: false }`. A função tem prioridade sobre `endpoint`.

## Bibliotecas e publicação

jQuery **3.7.1** e Tilt.js original **1.2.1** estão em `assets/vendor/`, com as licenças MIT. A fonte Poppins está em `assets/fonts/`, com sua licença OFL. O site não precisa de CDN.

Publique `index.html` e as pastas `assets/` e `imgs/` na mesma pasta do GitHub Pages. Os caminhos são relativos e funcionam em subdiretórios. Os ícones das habilidades usam os arquivos de `imgs/`. C# fica em Linguagens de programação; MySQL, em Banco de dados; Figma, em Ferramentas e publicação.

O comando opcional `npm run build` copia esses arquivos para `dist/`.

## Verificação de desenvolvimento

`npm install` instala somente a ferramenta de testes Playwright. Com Google Chrome instalado, `npm test` verifica navegação, temas, modal, dados pendentes, tilt, acessibilidade básica, galeria, formulário e responsividade. Não é necessário instalar dependências npm para usar ou publicar o site.

Referências de composição: [Zubayer](https://zubayer-sigma.vercel.app/), [Aditya](https://aditya-portfolio-dusky.vercel.app/) e [Matheus](https://matheuz101.github.io/portifolio-matheus/). Apenas os layouts e comportamentos foram adaptados; nenhum dado pessoal ou projeto desses autores foi utilizado.
