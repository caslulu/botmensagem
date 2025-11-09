from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, SelectField, BooleanField, RadioField, FieldList, FormField
from wtforms.validators import DataRequired
from app.forms.veiculo_form import VeiculoForm
from app.forms.pessoa_form import PessoaForm
from flask_wtf.file import MultipleFileField, FileAllowed

class CotacaoForm(FlaskForm):
    class Meta:
        csrf = False

    genero = RadioField('Gênero', choices=[('Masculino', 'Masculino'), ('Feminino', 'Feminino')], validators=[DataRequired()])
    estado_civil = RadioField('Estado Civil', choices=[('Solteiro', 'Solteiro'), ('Casado', 'Casado')], validators=[DataRequired()])
    nome = StringField('Nome Completo', validators=[DataRequired()])
    documento = StringField('Driver License', validators=[DataRequired()])
    endereco = StringField('Endereço', validators=[DataRequired()])
    tempo_de_seguro = SelectField('Tempo de Seguro', choices=[('Nunca Teve', 'Nunca Teve'), ('Menos de 1 ano', 'Menos de 1 ano'), ('1-3 Anos', 'Entre 1 e 3 anos'), ('3+ anos', 'Mais de 3 anos')], validators=[DataRequired()])
    data_nascimento = StringField('Data de Nascimento', validators=[DataRequired()])
    tempo_no_endereco = SelectField('Tempo no Endereço', choices=[('Menos de 1 Ano', 'Menos de 1 ano'), ('Mais de 1 Ano', 'Mais de 1 Ano')], validators=[DataRequired()])
    # Campos do cônjuge
    nome_conjuge = StringField('Nome do Cônjuge')
    data_nascimento_conjuge = StringField('Data de Nascimento do Cônjuge')
    documento_conjuge = StringField('Driver License do Cônjuge')
    colocar_trello = BooleanField('Colocar Trello')
    imagem_doc = MultipleFileField('Documentos/Imagens (opcional)', validators=[FileAllowed(['jpg', 'jpeg', 'png', 'pdf'], 'Apenas imagens ou PDF!')])
    submit = SubmitField('Enviar')
    veiculos = FieldList(FormField(VeiculoForm), min_entries=1, label='Veículos')
    pessoas = FieldList(FormField(PessoaForm), min_entries=0, label='Pessoas adicionais')
