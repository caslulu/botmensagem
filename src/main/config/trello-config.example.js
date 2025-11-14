/**
 * Configuração do Trello - ARQUIVO DE EXEMPLO
 * 
 * Este arquivo contém as credenciais do Trello que são compiladas
 * diretamente no executável para garantir que funcionem mesmo quando
 * o arquivo .env não está presente.
 * 
 * INSTRUÇÕES:
 * 1. Copie este arquivo para 'trello-config.js' (sem o .example)
 * 2. Substitua os valores abaixo pelas suas credenciais reais do Trello
 * 3. Não commite o arquivo trello-config.js (ele está no .gitignore)
 */

module.exports = {
  TRELLO_KEY: 'SUA_TRELLO_KEY_AQUI',
  TRELLO_TOKEN: 'SEU_TRELLO_TOKEN_AQUI',
  TRELLO_ID_LIST: 'SEU_TRELLO_ID_LIST_AQUI',
  URL_TRELLO: 'https://api.trello.com/1/cards'
};
