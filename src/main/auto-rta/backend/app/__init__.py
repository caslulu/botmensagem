import os
from flask import Flask, request, make_response, send_from_directory
from flask_cors import CORS
# from app.extensions import db, migrate  # Não necessário para RTA
from app.config import Config

# Importar routes da API
from app.routes.api_rta_routes import api_rta_bp
from app.routes.api_trello_routes import api_trello_bp

def create_app():
    # Configurar caminho absoluto para arquivos estáticos
    static_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static'))
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    app.config.from_object(Config)

    # Configurar CORS de forma simples e robusta
    CORS(app)

    # Handler adicional para garantir CORS
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    # Inicializar extensões - não necessárias para RTA
    # db.init_app(app)
    # migrate.init_app(app, db)

    # Registrar blueprints da API
    app.register_blueprint(api_rta_bp)
    app.register_blueprint(api_trello_bp)
    
    # Rota para servir o frontend em produção
    @app.route('/')
    def serve_frontend():
        static_path = app.static_folder
        index_path = os.path.join(static_path, 'index.html')
        print(f"DEBUG: Static folder: {static_path}")
        print(f"DEBUG: Index path: {index_path}")
        print(f"DEBUG: Index exists: {os.path.exists(index_path)}")
        
        if os.path.exists(index_path):
            return send_from_directory(static_path, 'index.html')
        else:
            return {'message': 'Frontend not built yet. Run the build script first.', 'status': 'development', 'static_folder': static_path}, 200
    
    @app.route('/<path:path>')
    def serve_static_files(path):
        # Se for uma rota de API, não interferir
        if path.startswith('api/'):
            return {'error': 'API endpoint not found'}, 404
        
        # Tentar servir arquivo estático
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            # SPA routing - sempre retornar index.html para rotas do frontend
            if os.path.exists(os.path.join(app.static_folder, 'index.html')):
                return send_from_directory(app.static_folder, 'index.html')
            else:
                return {'message': 'Frontend not built yet'}, 404

    # Criar tabelas do banco de dados - não necessário para RTA
    # with app.app_context():
    #     db.create_all()

    # Rota de health check
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Backend API funcionando', 'version': '1.0.0'}

    # Rota de informações da API
    @app.route('/api/info')
    def api_info():
        return {
            'name': 'Auto RTA API',
            'version': '1.0.0',
            'endpoints': {
                'rta': '/api/rta',
                'trello': '/api/trello'
            }
        }

    return app