import time

class Progressive():
    """
    Classe para automação de cotação no site da Progressive usando Playwright.
    """
    def cotacao(self, playwright, zipcode, first_name, last_name, email, data_nascimento, rua, cidade, apt=None, veiculos=None, genero=None, estado_documento=None, tempo_de_seguro=None, tempo_no_endereco=None, estado_civil=None, nome_conjuge=None, data_nascimento_conjuge=None, documento_conjuge=None, cotacao_obj=None):
        browser = playwright.chromium.launch(headless=False, args=["--incognito"])
        context = browser.new_context()
        self.page = context.new_page()
        try:
            self.pagina_inicial(zipcode=zipcode)
            try:
                self.page.wait_for_load_state("networkidle")
            except Exception as e:
                print(f"[WARN] Falha ao esperar networkidle: {e}")
            self.informacoes_basicas(first_name=first_name, last_name=last_name, email=email, data_nascimento=data_nascimento)
            self.informacoes_endereco(rua=rua, cidade=cidade, apt=apt)
            # Passa a lista completa de veículos
            if veiculos:
                try:
                    self.informacoes_veiculos(veiculos=veiculos)
                except:
                    pass
            # --- NOVO: buscar pessoas extras do banco ---
            pessoas_extras = []
            if cotacao_obj and hasattr(cotacao_obj, 'pessoas_json'):
                import json
                try:
                    pessoas_extras = json.loads(cotacao_obj.pessoas_json)
                except Exception:
                    pessoas_extras = []
            # Remove titular e cônjuge da lista de pessoas extras, se presentes
            titular_nome = first_name
            titular_sobrenome = last_name
            conjuge_nome = nome_conjuge if nome_conjuge else None
            pessoas_filtradas = []
            for p in pessoas_extras:
                nome_p = p.get('nome', '').strip()
                if nome_p and nome_p.lower() not in [titular_nome.lower(), (conjuge_nome or '').lower()]:
                    pessoas_filtradas.append(p)
            self.informacoes_pessoais(
                genero=genero,
                estado_documento=estado_documento,
                estado_civil=estado_civil,
                nome_conjuge=nome_conjuge,
                data_nascimento_conjuge=data_nascimento_conjuge,
                pessoas_extras=pessoas_filtradas
            )
            self.informacoes_seguro_anterior(tempo_de_seguro=tempo_de_seguro, tempo_no_endereco=tempo_no_endereco)
            time.sleep(300)
        except Exception as e:
            print(f"[ERRO] Falha geral na cotação: {e}")
        finally:
            context.close()
            browser.close()

    def pagina_inicial(self, zipcode):
        """Acessa a página inicial e seleciona Auto."""
        self.page.goto("https://www.progressive.com/")
        try:
            links = self.page.locator("a:has-text('Or, see all 30+ products'), a:has-text('See all 30+ products')")
            if links.count() > 0:
                links.first.click()
            else:
                self.page.get_by_role("link", name="Or, see all 30+ products").click()
        except Exception as e:
            try:
                self.page.get_by_role("link", name="See all 30+ products").click()
            except Exception as e2:
                print(f"[WARN] Nenhum link 'see all products' encontrado: {e}, {e2}")
        self.page.get_by_role("option", name="Auto", exact=True).click()
        self.page.get_by_role("textbox", name="Enter ZIP Code").fill(zipcode)
        self.page.get_by_role("button", name="Get a quote").click()

    def informacoes_basicas(self, first_name, last_name, email, data_nascimento):
        """Preenche informações básicas do usuário seguindo apenas cliques e waits, com timeout menor e debug."""
        print("[DEBUG] Preenchendo campos básicos...")
        # Tenta preencher usando variações de label
        self.page.get_by_label("First Name").click()
        self.page.get_by_label("First Name").fill(first_name)

        self.page.get_by_label("Last Name").click()
        self.page.get_by_label("Last Name").fill(last_name)

        self.page.get_by_label("Primary email address").click()
        self.page.get_by_label("Primary email address").fill(email)

        self.page.get_by_label("Date of birth*").click()
        self.page.get_by_label("Date of birth*").fill(data_nascimento)

        self.page.get_by_role("button", name="Continue").click()

    def informacoes_endereco(self, rua, cidade, apt=None):
        """Preenche endereço do usuário."""
        self.page.wait_for_load_state("load")
        self.page.get_by_label("Street number and name").click()
        self.page.get_by_label("Street number and name").fill(rua)
        self.page.get_by_label("Apt./Unit #").click()
        if apt is not None:
            self.page.get_by_label("Apt./Unit #").fill(apt)
            self.page.get_by_label("City").click()
        self.page.get_by_label("City").fill(cidade)
        self.page.get_by_role("button", name="Ok, start my quote").click()

    def informacoes_veiculos(self, veiculos):
        """Preenche informações de todos os veículos."""
        self.nova_interface = None
        try:
            self.page.set_default_timeout(7000)
            self.page.get_by_role("button", name="No, I'll add my own").click()
        except Exception:
            pass
        self.page.set_default_timeout(30000)
        if self.nova_interface is None:
            self.nova_interface = self.page.is_visible("label:has-text('Vehicle use')")
        for idx, veiculo in enumerate(veiculos):
            # Corrige caso veiculos seja uma string (ex: 'veiculos') ao invés de lista de dicts
            if isinstance(veiculo, dict):
                vin_val = veiculo.get('vin', '')
            elif hasattr(veiculo, 'vin'):
                vin_val = getattr(veiculo, 'vin', '')
            else:
                continue  # Pula esse item inválido
            if idx > 0:
                self.page.get_by_role("button", name="+Add another vehicle").click()
            self.page.wait_for_selector("a:has-text('Enter by VIN')", timeout=10000)
            self.page.click("a:has-text('Enter by VIN')")
            self.page.wait_for_selector("input[name='VehiclesNew_embedded_questions_list_Vin']", timeout=10000)
            self.page.fill("input[name='VehiclesNew_embedded_questions_list_Vin']", vin_val)
            try:
                self.page.get_by_label("Learn more aboutVehicle use*").select_option("1")
            except Exception:
                pass
            time.sleep(2)
            if veiculo.get('financiado') == "Financiado":
                self.page.get_by_label("Own or lease?").select_option("2")
            else:
                self.page.get_by_label("Own or lease?").select_option("3")
            time.sleep(2)
            if veiculo.get('tempo_com_veiculo') == "Menos de 1 ano":
                self.page.get_by_label("How long have you had this").select_option("A")
            elif veiculo.get('tempo_com_veiculo') == "1-3 anos":
                self.page.get_by_label("How long have you had this").select_option("B")
            else:
                self.page.get_by_label("How long have you had this").select_option("C")
            time.sleep(2)
            if self.nova_interface:
                self.page.get_by_label("Learn more aboutAnnual").select_option("0 - 3,999")
            else:
                self.page.get_by_label("Learn more aboutAnnual").select_option(index=1)
            time.sleep(2)
            # Após preencher o veículo, clique em Continue para liberar o próximo formulário
            if idx < len(veiculos) - 1:
                self.page.get_by_role("button", name="+Add another vehicle").click()
        # Após todos os veículos, clique em Continue final
        self.page.get_by_role("button", name="Continue").click()

    def informacoes_pessoais(self, genero, estado_documento, estado_civil=None, nome_conjuge=None, data_nascimento_conjuge=None, pessoas_extras=None):
        from app.util.data_funcoes import separar_nome
        try:
            # Motorista principal
            if genero == "Masculino":
                self.page.get_by_label("Male", exact=True).check()
            else:
                self.page.get_by_label("Female").check()
            self.page.pause()
            if estado_civil == "Casado":
                self.page.get_by_label("Marital status").select_option("M")
            else:
                self.page.get_by_label("Marital status").select_option("S")
            try:
                self.page.set_default_timeout(7000)
                self.page.locator("#DriversAddPniDetails_embedded_questions_list_PrimaryResidence").select_option("T")
            except Exception:
                # Caso a opção de residência não esteja disponível, preenche outros campos obrigatórios
                self.page.get_by_label("Highest level of education*").select_option("2")
                time.sleep(2)
                self.page.get_by_label("Employment status*").select_option("EM")
                time.sleep(2)
                self.page.get_by_role("combobox", name="Occupation view entire list").click()
                time.sleep(2)
                self.page.get_by_role("combobox", name="Occupation view entire list").fill("worker")
                time.sleep(2)
                self.page.get_by_text("Worker: All Other").click()
                time.sleep(2)
                self.page.get_by_label("Primary residence*").select_option("R")
            self.page.set_default_timeout(30000)
            if estado_documento != "IT":
                self.page.get_by_role("group", name="Has your license been valid").get_by_label("Yes").check()
                self.page.get_by_role("group", name="Any license suspensions in").get_by_label("No").check()
            else:
                self.page.get_by_label("U.S. License type").select_option("F")
            self.page.get_by_role("group", name="Accidents, claims, or other").get_by_label("No").check()
            self.page.get_by_role("group", name="Tickets or violations?").get_by_label("No").check()
            self.page.get_by_role("button", name="Continue").click()
            # Se casado, preenche informações do cônjuge
            if estado_civil == "Casado" and nome_conjuge and data_nascimento_conjuge:
                partes = nome_conjuge.strip().split()
                first_name_conjuge = partes[0]
                last_name_conjuge = partes[-1] if len(partes) > 1 else ""
                genero_conjuge = "Feminino" if genero == "Masculino" else "Masculino"
                self.page.get_by_label("First Name").fill(first_name_conjuge)
                self.page.get_by_label("Last Name").fill(last_name_conjuge)
                self.page.get_by_label("Date of birth").fill(data_nascimento_conjuge)
                if genero_conjuge == "Masculino":
                    self.page.get_by_label("Male", exact=True).check()
                else:
                    self.page.get_by_label("Female").check()
                # Repete marcação dos campos obrigatórios para o cônjuge
                if estado_documento != "IT":
                    self.page.get_by_role("group", name="Has your license been valid").get_by_label("Yes").check()
                    self.page.get_by_role("group", name="Any license suspensions in").get_by_label("No").check()
                else:
                    self.page.get_by_label("U.S. License type").select_option("F")
                self.page.get_by_role("group", name="Accidents, claims, or other").get_by_label("No").check()
                self.page.get_by_role("group", name="Tickets or violations?").get_by_label("No").check()
                self.page.get_by_role("button", name="Continue").click()

            # Preencher pessoas extras (exceto titular e cônjuge)
            if pessoas_extras:
                for pessoa in pessoas_extras:
                    first_name, last_name = separar_nome(pessoa.get("nome", ""))
                    self.page.get_by_role("button", name="Add another person").click()
                    self.page.get_by_role("textbox", name="First name").click()
                    self.page.get_by_role("textbox", name="First name").fill(first_name)
                    self.page.get_by_role("textbox", name="Last name").click()
                    self.page.get_by_role("textbox", name="Last name").fill(last_name)
                    genero_p = pessoa.get("genero", "Feminino")
                    if genero_p == "Masculino":
                        self.page.get_by_role("radio", name="Male").check()
                    else:
                        self.page.get_by_role("radio", name="Female").check()
                    self.page.get_by_role("textbox", name="Date of birth").click()
                    self.page.get_by_role("textbox", name="Date of birth").fill(pessoa.get("data_nascimento"))
                    self.page.get_by_label("Marital status*").select_option("S")
                    self.page.get_by_label("Relationship to Teste (Driver").select_option("O")
                    self.page.get_by_role("group", name="Has this driver's license").get_by_label("Yes").check()
                    self.page.get_by_role("group", name="Any license suspensions in").get_by_label("No").check()
                    self.page.get_by_role("group", name="Accidents, claims, or other").get_by_label("No").check()
                    self.page.get_by_role("group", name="Tickets or violations?").get_by_label("No").check()
                    self.page.get_by_role("button", name="Continue").click()
        except Exception as e:
            print(f"[WARN] Falha ao preencher informações pessoais: {e}")

    def informacoes_seguro_anterior(self, tempo_de_seguro, tempo_no_endereco):
        """Preenche informações sobre o seguro anterior."""
        try:
            if tempo_de_seguro == "Nunca Teve":
                self.page.get_by_label("Do you have auto insurance").get_by_label("No").check()
                self.page.get_by_label("Have you had auto insurance in the last 31 days?*").get_by_label("No").check()
            elif tempo_de_seguro == "Menos De 1 Ano":
                self.page.get_by_label("Do you have auto insurance").get_by_label("Yes").check()
                self.page.get_by_label("How long have you been with").select_option("A")
                self.page.get_by_label("Have you been insured for the").get_by_label("Yes").check()
            elif tempo_de_seguro == "1-3 Anos":
                self.page.get_by_label("Do you have auto insurance").get_by_label("Yes").check()
                self.page.get_by_label("How long have you been with").select_option("B")
            else:
                self.page.get_by_label("Do you have auto insurance").get_by_label("Yes").check()
                self.page.get_by_label("How long have you been with").select_option("C")
            self.page.get_by_label("Do you have non-auto policies").get_by_label("No").check()
            self.page.get_by_label("Have you had auto insurance").get_by_label("No").check()
            try:
                self.page.set_default_timeout(7000)
                if tempo_no_endereco == "Mais de 1 Ano":
                    self.page.get_by_label("How long have you lived at").select_option("C")
                else:
                    self.page.get_by_label("How long have you lived at").select_option("B")
            except Exception:
                pass
            self.page.set_default_timeout(30000)
            self.page.get_by_role("button", name="Continue").click()
        except Exception as e:
            print(f"[WARN] Falha ao preencher seguro anterior: {e}")

