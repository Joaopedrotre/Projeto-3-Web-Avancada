// =====================================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =====================================================================
import { inicializarDashboard } from './dashboard.js';
import { definirCategorias, inicializarTelaProdutos } from './produtos.js';
async function carregarCategorias() {
    try {
        const resposta = await fetch('/auto-nobre/backend/api/categorias.php');
        const corpo = await resposta.json();
        if (typeof corpo !== 'object' || corpo === null || !('dados' in corpo)) {
            return [];
        }
        const respostaTipada = corpo;
        return respostaTipada.dados ?? [];
    }
    catch {
        return [];
    }
}
async function iniciar() {
    const categorias = await carregarCategorias();
    definirCategorias(categorias);
    await inicializarDashboard();
    await inicializarTelaProdutos();
}
document.addEventListener('DOMContentLoaded', () => {
    void iniciar();
});
//# sourceMappingURL=main.js.map