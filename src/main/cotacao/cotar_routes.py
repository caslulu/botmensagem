from flask import Blueprint, render_template, redirect, url_for, request
from app.models.cotacao_db import Cotacao
from app.services.cotacao_service import CotacaoService
from app.services.progressive_service import Progressive
from app.services.geico_services import Geico
from app.services.allstate_services import Allstate
from playwright.sync_api import sync_playwright

cotar_bp = Blueprint('cotar', __name__)
cotar_service = CotacaoService()

@cotar_bp.route('/cotar/<cotacao_id>', methods=['POST'])
def cotar(cotacao_id):
    try:
        cotacao = Cotacao.query.get_or_404(cotacao_id)
        seguradora = request.form.get('seguradora')
        if cotacao:
            executar_cotacao(cotacao, seguradora=seguradora)
            return "Cotação processada com sucesso!"
        else:
            return redirect(url_for('cotacao.cotacao'))
    except Exception as e:
        print(f"Erro ao processar cotação: {e}")
        return render_template('erro.html', mensagem="Erro ao processar cotação")


def executar_cotacao(cotacao, seguradora):
    dados = cotar_service.processar_cotacao(cotacao)
    if seguradora == "Progressive":
        p = Progressive()
    elif seguradora == "Geico":
        p = Geico()
    else:
        p = Allstate()
    with sync_playwright() as playwright:
        p.cotacao(playwright, **dados)