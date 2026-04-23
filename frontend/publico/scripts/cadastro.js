const form = document.getElementById('formCadastro');
const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmarSenha');
const btnSubmit = document.getElementById('btnSubmit');

form.addEventListener('submit', async function(event) {
  event.preventDefault();
  if (senha.value !== confirmarSenha.value) {
    alert('As senhas digitadas não são iguais.');
    return;
  }
  const formData = {
    nome: document.getElementById('nome').value,
    crea: document.getElementById('crea').value,
    cidade: document.getElementById('cidade').value,
    uf: document.getElementById('uf').value,
    email: document.getElementById('email').value,
    senha: senha.value 
  };
  const textoOriginalBotao = btnSubmit.innerText;
  btnSubmit.innerText = 'Processando...';
  btnSubmit.disabled = true;
  try {
    const API_URL = 'https://sua-api.com.br/api/auth/register'; 
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao comunicar com o servidor.');
    }
    await response.json();
    alert('Conta criada com sucesso!');
    form.reset();
  } catch (error) {
    alert(`Não foi possível realizar o cadastro: ${error.message}`);
  } finally {
    btnSubmit.innerText = textoOriginalBotao;
    btnSubmit.disabled = false;
  }
});