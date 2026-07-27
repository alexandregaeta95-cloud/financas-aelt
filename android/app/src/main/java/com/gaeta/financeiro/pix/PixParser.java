package com.gaeta.financeiro.pix;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PixParser {

    private static final String[] KNOWN_BANKS = {
            "Nubank", "Itaú", "Itau", "Bradesco", "Banco do Brasil", "Caixa",
            "Banco Inter", "Inter", "Santander", "C6 Bank", "C6", "PagBank",
            "PagSeguro", "Mercado Pago", "PicPay", "Sicoob", "Sicredi", "BTG Pactual",
            "BTG", "Next", "Neon", "Safra", "Banrisul", "Original", "Stone"
    };

    public static JSONObject parseNotification(String packageName, String title, String text) {
        JSONObject result = new JSONObject();
        try {
            String combinedText = ((title != null ? title : "") + " " + (text != null ? text : "")).trim();
            String lowerText = combinedText.toLowerCase(Locale.ROOT);

            // Verify if it's a financial/PIX notification
            boolean isPix = lowerText.contains("pix") ||
                            lowerText.contains("transferência") ||
                            lowerText.contains("transferencia") ||
                            lowerText.contains("recebeu") ||
                            lowerText.contains("enviou") ||
                            lowerText.contains("pagamento");

            if (!isPix) {
                result.put("isFinancial", false);
                return result;
            }

            result.put("isFinancial", true);
            result.put("textoOriginal", combinedText);
            result.put("packageName", packageName != null ? packageName : "");

            // 1. Extract Bank Name
            String detectedBank = extractBank(packageName, combinedText);
            result.put("banco", detectedBank);

            // 2. Extract Value (Amount)
            double valor = extractAmount(combinedText);
            result.put("valor", valor);

            // 3. Extract Type (RECEBIDO / ENVIADO)
            String tipo = "RECEBIDO"; // Default
            if (lowerText.contains("enviou") || lowerText.contains("pago") || lowerText.contains("pagou") || lowerText.contains("realizado") || lowerText.contains("enviado")) {
                tipo = "ENVIADO";
            }
            result.put("tipo", tipo);

            // 4. Extract Name (Person / Company)
            String nomePessoa = extractName(combinedText, tipo);
            result.put("nomePessoa", nomePessoa);

            // 5. Date and Time
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            Date now = new Date();

            result.put("data", dateFormat.format(now));
            result.put("hora", timeFormat.format(now));
            result.put("timestamp", System.currentTimeMillis());

        } catch (JSONException e) {
            e.printStackTrace();
        }
        return result;
    }

    public static String extractBank(String packageName, String text) {
        if (packageName != null) {
            String lowerPkg = packageName.toLowerCase(Locale.ROOT);
            if (lowerPkg.contains("nubank")) return "Nubank";
            if (lowerPkg.contains("itau")) return "Itaú";
            if (lowerPkg.contains("bradesco")) return "Bradesco";
            if (lowerPkg.contains("bb") || lowerPkg.contains("bancodobrasil")) return "Banco do Brasil";
            if (lowerPkg.contains("caixa")) return "Caixa Econômica";
            if (lowerPkg.contains("inter")) return "Banco Inter";
            if (lowerPkg.contains("santander")) return "Santander";
            if (lowerPkg.contains("c6")) return "C6 Bank";
            if (lowerPkg.contains("pagseguro") || lowerPkg.contains("pagbank")) return "PagBank";
            if (lowerPkg.contains("mercadopago")) return "Mercado Pago";
            if (lowerPkg.contains("picpay")) return "PicPay";
            if (lowerPkg.contains("sicoob")) return "Sicoob";
            if (lowerPkg.contains("sicredi")) return "Sicredi";
            if (lowerPkg.contains("btg")) return "BTG Pactual";
            if (lowerPkg.contains("next")) return "Next";
            if (lowerPkg.contains("neon")) return "Neon";
            if (lowerPkg.contains("stone")) return "Stone";
        }

        for (String bank : KNOWN_BANKS) {
            if (text.toLowerCase(Locale.ROOT).contains(bank.toLowerCase(Locale.ROOT))) {
                return bank;
            }
        }

        return "Banco Desconhecido";
    }

    public static double extractAmount(String text) {
        Pattern pattern = Pattern.compile("R\\$\\s*([\\d\\.,]+)");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String amountStr = matcher.group(1);
            if (amountStr != null) {
                amountStr = amountStr.replace(".", "").replace(",", ".");
                try {
                    return Double.parseDouble(amountStr);
                } catch (NumberFormatException ignored) {}
            }
        }
        return 0.0;
    }

    public static String extractName(String text, String tipo) {
        Pattern pattern;
        if ("RECEBIDO".equals(tipo)) {
            pattern = Pattern.compile("(?i)(?:de|por)\\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇNa-záàâãéèêíïóôõöúç\\s]{3,40}?)(?=\\s+no|\\s+via|\\s+em|\\s+R\\$|\\.|$)");
        } else {
            pattern = Pattern.compile("(?i)(?:para|a)\\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇNa-záàâãéèêíïóôõöúç\\s]{3,40}?)(?=\\s+no|\\s+via|\\s+em|\\s+R\\$|\\.|$)");
        }

        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String name = matcher.group(1);
            if (name != null) {
                name = name.trim();
                if (name.length() > 2 && !name.equalsIgnoreCase("você") && !name.equalsIgnoreCase("voce")) {
                    return name;
                }
            }
        }
        return "Não identificado";
    }
}
