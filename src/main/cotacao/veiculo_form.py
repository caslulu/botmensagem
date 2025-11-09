from flask_wtf import FlaskForm
from wtforms import StringField, SelectField
from wtforms.validators import DataRequired

class VeiculoForm(FlaskForm):
    class Meta:
        csrf = False

    vin = StringField('VIN', validators=[DataRequired()])
    tempo_com_veiculo = SelectField('Tempo com Veículo', choices=[('Menos de 1 ano', 'Menos de 1 ano'), ('1-3 Anos', 'Entre 1 e 3 anos'), ('Mais de 5 Anos', '5 Anos ou mais')], validators=[DataRequired()])
    financiado = SelectField('Estado do Veiculo', choices=[('Financiado', 'Financiado'), ('Quitado', 'Quitado')], validators=[DataRequired()])
    placa = StringField('Placa')
