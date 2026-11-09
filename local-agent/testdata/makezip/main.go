// Test helper: create a password-protected ZIP (AES-256) containing a CSV.
//
// Usage:
//   go run . <out.zip> <password> [input.csv] [entry-name-in-zip.csv]
//
// If input.csv is omitted, a small built-in sample is used. If the entry name
// is omitted, it defaults to "cif_pii.csv".
package main

import (
	"os"

	"github.com/yeka/zip"
)

func main() {
	out := "test.zip"
	pw := "rahasia123"
	inputCSV := ""
	entryName := "cif_pii.csv"

	if len(os.Args) > 1 {
		out = os.Args[1]
	}
	if len(os.Args) > 2 {
		pw = os.Args[2]
	}
	if len(os.Args) > 3 {
		inputCSV = os.Args[3]
	}
	if len(os.Args) > 4 {
		entryName = os.Args[4]
	}

	var csv []byte
	if inputCSV != "" {
		b, err := os.ReadFile(inputCSV)
		if err != nil {
			panic(err)
		}
		csv = b
	} else {
		csv = []byte("cif,name,address,title\n" +
			"57858446,Julia Kumalasari,Jl. Pelajar No. 10 Jakarta,Mahasiswa\n" +
			"48610314,Endah Setiawati,Jl. Produktif No. 12 Surabaya,Mahasiswa\n" +
			"88241342,Intan Yulianti,Jl. Muda No. 14 Bandung,Mahasiswa\n")
	}

	f, err := os.Create(out)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	zw := zip.NewWriter(f)
	w, err := zw.Encrypt(entryName, pw, zip.AES256Encryption)
	if err != nil {
		panic(err)
	}
	if _, err := w.Write(csv); err != nil {
		panic(err)
	}
	if err := zw.Close(); err != nil {
		panic(err)
	}
	println("wrote", out, "("+entryName+") with password", pw)
}
