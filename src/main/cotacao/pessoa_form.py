from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, RadioField
from wtforms.validators import DataRequired

class PessoaForm(FlaskForm):
    class Meta:
        csrf = False

    nome = StringField('Nome', validators=[DataRequired()])
    documento = StringField('Documento', validators=[DataRequired()])
    data_nascimento = StringField('Data de Nascimento', validators=[DataRequired()])
    parentesco = SelectField('Parentesco', choices=[('Filho(a)', 'Filho(a)'), ('Pai/Mãe', 'Pai/Mãe'), ('Outro', 'Outro')], validators=[DataRequired()])
    genero = RadioField('Gênero', choices=[('Masculino', 'Masculino'), ('Feminino', 'Feminino')], validators=[DataRequired()])
