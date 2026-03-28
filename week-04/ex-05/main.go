package main

import (
	"fmt"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, Docker Go!\n")
}

func main() {
	http.HandleFunc("/", handler)
	
	port := "8080"
	fmt.Printf("Go Server đang chạy trên cổng %s...\n", port)
	
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Printf("Lỗi server: %s\n", err)
	}
}
