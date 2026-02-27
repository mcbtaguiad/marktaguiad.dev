---
title: "Tara-Go"
date: 2026-02-24
author: "Mark Taguiad"
tags: ["go", "golang"]
UseHugoToc: true
weight: 2
---

{{< toc >}}
### Hello, World
```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, World")
}
```
```go
go run hello-work.go

go build hello-world.go

./hello-world
```
### Values
- String - can be added together with +.
- Interger and floats.
- Booleans, with boolean operators.
```bash
package main

import "fmt"

func main() {
	fmt.Println("go" + "lang")

	fmt.Println("1+1 = ", 1+1)

	fmt.Println(true && false)
	fmt.Println(true || false)
	fmt.Println(!true)
}
```
### Variables
```bash
package main

import "fmt"

func main() {
	var a = "initial"
	fmt.Println(a)

	var b, c int = 1, 2
	fmt.Println(b, c)

	var d = true
	fmt.Println(d)

	var e int
	fmt.Println(e)
    
    // shorthand declaration
    // can only be used inside a function
	f := "apple"
	fmt.Println(f)
}
```
### Constant
```bash
package main

import (
	"fmt"
	"math"
)

// can be used inside/outside a function
const s string = "constant"

func main() {
	fmt.Println(s)

	const n = 5000000000

	const d = 3e20 / n
	fmt.Println(d)

	fmt.Println(int64(d))

	fmt.Println(math.Sin(n))
}
```
### For
```bash
package main

import (
	"fmt"
)

func main() {
	i := 1
	for i <= 3 {
		fmt.Println(i)
		i = i + 1
	}
	for j := 0; j < 3; j++ {
		fmt.Println(j)
	}
	for i := range 3 {
		fmt.Println("range", i)
	}
	for {
		fmt.Println("loop")
		break
	}
	for n := range 6 {
		if n%2 == 0 {
			continue
		}
		fmt.Println(n)
	}
}
```

### If/Else

