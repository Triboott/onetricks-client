$cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\CurrentUser\My" -KeyExportPolicy Exportable -KeySpec Signature

# Export Certificate (cert.pem)
$certPem = "-----BEGIN CERTIFICATE-----`r`n" + [System.Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks) + "`r`n-----END CERTIFICATE-----"
[System.IO.File]::WriteAllText("c:\Users\crist\Documents\onetricks\onetricks-client\cert.pem", $certPem)

# Export Private Key (key.pem)
$key = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$keyBytes = $key.ExportPkcs8PrivateKey()
$keyPem = "-----BEGIN PRIVATE KEY-----`r`n" + [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`r`n-----END PRIVATE KEY-----"
[System.IO.File]::WriteAllText("c:\Users\crist\Documents\onetricks\onetricks-client\key.pem", $keyPem)

Write-Host "Certificates generated successfully!"
