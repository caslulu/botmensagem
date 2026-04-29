package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
)

type rtaInput map[string]any

type pdfFormData struct {
	Forms []pdfForm `json:"forms"`
}

type pdfForm struct {
	TextFields []pdfTextField `json:"textfield,omitempty"`
	Checkboxes []pdfCheckbox  `json:"checkbox,omitempty"`
}

type pdfTextField struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type pdfCheckbox struct {
	Name  string `json:"name"`
	Value bool   `json:"value"`
}

var transactionFields = []string{
	"Reg and Title a Vehicle",
	"Transfer Plate",
	"Reinstate Reg",
	"Apply for salvage title",
	"Apply for title",
	"Registration only",
	"Transfer plate",
	"Register prev title",
	"Title prev reg vehicle",
	"Transfer vehicle to spouse",
	"Change plate",
	"Renew reg",
}

func installPDFCPUFonts() error {
	candidates := []string{
		"/usr/share/fonts/truetype/roboto/unhinted/RobotoTTF/Roboto-Regular.ttf",
		"/usr/share/fonts/truetype/roboto/Roboto-Regular.ttf",
	}
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			_ = api.LoadConfiguration()
			if err := api.InstallFonts([]string{path}); err != nil {
				return err
			}
			_ = api.LoadConfiguration()
			return nil
		}
	}
	return nil
}

func (a *App) handleGenerateRTA(w http.ResponseWriter, r *http.Request) error {
	var input rtaInput
	if err := decodeJSONLoose(r, &input); err != nil {
		return err
	}
	insuranceCompany := readString(input["insurance_company"], input["seguradora"], "allstate")
	templatePath := a.rtaTemplatePath(insuranceCompany)
	if _, err := os.Stat(templatePath); err != nil {
		return err
	}

	fileName := sanitizeFileName("rta-" + insuranceCompany + "-" + fileTimestamp() + ".pdf")
	outputPath := filepath.Join(a.cfg.GeneratedDir, fileName)
	formJSON, err := os.CreateTemp("", "botmensagem-rta-*.json")
	if err != nil {
		return err
	}
	formPath := formJSON.Name()
	defer os.Remove(formPath)

	if err := json.NewEncoder(formJSON).Encode(buildRTAFormData(input)); err != nil {
		_ = formJSON.Close()
		return err
	}
	_ = formJSON.Close()

	if err := installPDFCPUFonts(); err != nil {
		return err
	}
	conf := api.LoadConfiguration()
	if err := api.FillFormFile(templatePath, formPath, outputPath, conf); err != nil {
		return err
	}
	file, err := a.createFileAsset(r.Context(), "rta", fileName, "application/pdf", outputPath, nil)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"fileId":      file.ID,
		"filename":    file.Filename,
		"downloadUrl": file.DownloadURL,
	})
	return nil
}

func (a *App) rtaTemplatePath(insuranceCompany string) string {
	key := strings.ToLower(strings.TrimSpace(insuranceCompany))
	assetsDir := filepath.Join(a.cfg.AssetsDir, "rta")
	switch key {
	case "progressive":
		return filepath.Join(assetsDir, "rta_template_progressive.pdf")
	case "geico":
		return filepath.Join(assetsDir, "rta_template_geico.pdf")
	case "liberty":
		return filepath.Join(assetsDir, "rta_template_liberty.pdf")
	default:
		return filepath.Join(assetsDir, "rta_template_allstate.pdf")
	}
}

func buildRTAFormData(input rtaInput) pdfFormData {
	textValues := map[string]string{
		"(L1) Seller name (Please print)":                               readString(input["seller_name"]),
		"(L2) (Seller) Address":                                         readString(input["seller_street"]),
		"(L2) (Seller) City":                                            readString(input["seller_city"]),
		"(L2) (Seller) State":                                           readString(input["seller_state"]),
		"(L2) (Seller) Zip Code":                                        readString(input["seller_zipcode"]),
		"(I3) Gross Sale Price (Proof Required)":                        readString(input["gross_sale_price"]),
		"(J1) Purchase Date":                                            formatRTADate(input["purchase_date"]),
		"(K3) Effective Date of Insurance":                              formatRTADate(input["insurance_effective_date"]),
		"(K5) Policy Change Date":                                       formatRTADate(input["insurance_policy_change_date"]),
		"(D2) (First Owner's) Name (Last, First, Middle)":               readString(input["owner_name"]),
		"(D3) (Owner 1) Date of Birth (MM [Month]/DD [Day]/YYYY[Year])": readString(input["owner_dob"]),
		"(D4) (Owner 1) License Number/ ID (Identification) Number / SSN (Social Security Number)": readString(input["owner_license"]),
		"(D5) (Owner 1) Residential Address":       readString(input["owner_street"]),
		"(D5) (Owner 1) City":                      readString(input["owner_city"]),
		"(D5) (Owner 1) State":                     readString(input["owner_state"]),
		"(D5) (Owner 1) Zip Code":                  readString(input["owner_zipcode"]),
		"(G1) (Garaging) Address":                  readString(input["owner_street"]),
		"(G1) (Garaging Address) City":             readString(input["owner_city"]),
		"(G1) (Garaging Address) State":            readString(input["owner_state"]),
		"(G1) (Garaging Address) Zip Code":         readString(input["owner_zipcode"]),
		"(B1) Vehicle Identification Number (VIN)": readString(input["vin"]),
		"(B2) Body Style":                          readString(input["body_style"]),
		"(B5) Vehicle Year":                        readString(input["year"]),
		"(B5) (Vehicle) Make":                      readString(input["make"]),
		"(B5) (Vehicle) Model":                     readString(input["model"]),
		"(B5) (Vehicle) Model Number":              readString(input["model"]),
		"(B7) Number of cylinders":                 readString(input["cylinders"]),
		"(B7) Number of passengers":                readString(input["passengers"]),
		"(B7) Number of doors":                     readString(input["doors"]),
		"(B9) Odometer (Miles)":                    readString(input["odometer"]),
		"(C3) Previous title number":               readString(input["previous_title_number"]),
		"(C3) Previous title state":                readString(input["previous_title_state"]),
		"(C3) Previous title country":              readString(input["previous_title_country"]),
		"(Lienholder) 1st (First) Lien Code":       readString(input["lienholder_code"]),
		"(Lienholder) (First Lien Code) Name":      readString(input["lienholder_name"]),
		"(Lienholder) (First Lien Code) Address":   readString(input["lienholder_address"]),
	}
	textFields := make([]pdfTextField, 0, len(textValues))
	for name, value := range textValues {
		if value != "" {
			textFields = append(textFields, pdfTextField{Name: name, Value: value})
		}
	}

	checkboxes := []pdfCheckbox{}
	chosenColor := strings.ToLower(strings.TrimSpace(readString(input["color"])))
	for _, colorName := range []string{"Black", "White", "Brown", "Blue", "Yellow", "Gray", "Purple", "Green", "Orange", "Red", "Silver", "Gold"} {
		value := chosenColor == strings.ToLower(colorName)
		checkboxes = append(checkboxes, pdfCheckbox{Name: "(B4) " + colorName, Value: value})
		if colorName == "White" || colorName == "Purple" {
			checkboxes = append(checkboxes, pdfCheckbox{Name: "(B4 ) " + colorName, Value: value})
		}
	}
	transaction := readString(input["transaction_type"])
	for _, name := range transactionFields {
		checkboxes = append(checkboxes, pdfCheckbox{Name: name, Value: transaction == name})
	}

	return pdfFormData{Forms: []pdfForm{{TextFields: textFields, Checkboxes: checkboxes}}}
}

func formatRTADate(value any) string {
	raw := readString(value)
	if raw == "" {
		return ""
	}
	if len(raw) == 10 && raw[4] == '-' && raw[7] == '-' {
		return raw[5:7] + "/" + raw[8:10] + "/" + raw[0:4]
	}
	if len(raw) == 10 && raw[2] == '/' && raw[5] == '/' {
		return raw
	}
	return ""
}
