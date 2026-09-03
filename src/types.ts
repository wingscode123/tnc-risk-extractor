export interface ItemRisiko {
  pasal_terkait: string;
  tingkat_risiko: "Tinggi" | "Sedang" | string;
  penjelasan_bahasa_manusia: string;
}

export interface HasilAnalisis {
  daftar_risiko: ItemRisiko[];
}

export interface ContohDokumen {
  id: string;
  judul: string;
  deskripsi: string;
  teks: string;
}
