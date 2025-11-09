from flask_wtf import FlaskForm
from wtforms import RadioField

class SeguradoraForm(FlaskForm):
    seguradora = RadioField('Seguradora', choices=[ ('Progressive', 'Progressive'), ('Geico', 'Geico'), ('Allstate', 'Allstate') ])