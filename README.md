# HAZUNI STREAMING

Biblioteca digital pessoal para catalogar filmes, séries e games. Os cadastros e capas enviados são armazenados no IndexedDB do navegador; não há contas, anúncios ou transmissão de conteúdo.

## Executar

```bash
npm install
npm run dev
```

Para validar ou gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Capas e pôsteres

Na janela de cadastro, escolha **Filme** ou **Série** no seletor de categoria; os campos e o status se ajustam e o cadastro é salvo na categoria escolhida. O título digitado já preenche a busca de capas. A pesquisa consulta Wikipedia, TVmaze, Openverse e Wikimedia Commons sem exigir chave de API; os resultados relacionados são priorizados sem descartar imagens só porque o nome do arquivo não corresponde exatamente ao título. Para priorizar pôsteres oficiais de filmes e séries, configure uma chave de API do TMDB em **Ajustes e integrações**. Também é possível informar uma URL ou enviar uma imagem de até 5 MB.

Na visão geral, use **Adicionar game** para abrir direto o cadastro de jogos. O botão **Voltar** retorna à biblioteca completa quando estiver em uma categoria ou nos favoritos.

As chaves são guardadas no armazenamento local do navegador. A busca depende de conexão com a internet; os dados cadastrados continuam disponíveis localmente.

## Backup

Use **Ajustes e integrações → Exportar backup** para baixar um arquivo JSON. A importação substitui toda a biblioteca atual deste navegador e pede confirmação antes de restaurar.

## Privacidade e armazenamento

Os registros e imagens enviadas ficam no IndexedDB deste navegador e não são sincronizados automaticamente entre dispositivos. Exporte um backup para transferir sua biblioteca. Limpar os dados do navegador pode remover os cadastros; mantenha cópias de backup.
