---
title: "Awkward Ranger"
date: 2026-02-18
author: "Mark Taguiad"
tags: ["awk"]
UseHugoToc: true
weight: 2
---
[![imagen](/images/ranger-vim-sed-awk-find/awkranger.jpeg)](/images/ranger-vim-sed-awk-find/awkranger.jpeg)

{{< toc >}}

### What is Awk?
AWK is a pattern–action text processing language great for logs, CSVs, reports, and automation.

### Print
```bash
awk 'BEGIN { print "Hello, AWK!" }'

Hello, AWK!
```

#### Lines
```sh
awk '{ print }' file.txt

Hello World!
hello world!
<pusa>
1 2 3 takbo...
pelepens; flood control;
Dunk it Jonathan!
```

#### Match and print
```sh
awk '/Dunk/ { print }' file.txt

Dunk it Jonathan!
```
#### Line numbers
- `NR` - current line numbers
- `$0` - whole line
```sh
awk '{ print NR, $0 }' file.txt

1 Hello World!
2 hello world!
3 <pusa>
4 1 2 3 takbo...
5 pelepens; flood control;
6 Dunk it Jonathan!
```
### Fields and Columns
*file.txt*
```code
Jonathan 28 Manila
Berto 30 Luna
Betsy 23 Rizal
```
#### Print column
```sh
awk '{ print $1 }' file.txt

Jonathan
Berto
Betsy
```
```sh 
awk '{ print $1, $3 }' file.txt

Jonathan Manila
Berto Luna
Betsy Rizal
```
#### Field separator
```sh
echo "apple,banana,orange" | awk 'BEGIN {FS=","} {print $2}'

banana
```
Or using -F followed by the separator, in this example `,`.
```sh
echo "apple,banana,orange" | awk -F, '{print $1}'

apple
```
#### Changing the output separator
```sh
echo "John Doe 101 Sales" | awk -v OFS=":" '{print $1, $2, $3, $4}'

John:Doe:101:Sales
```
#### Conditions - patterns
Print lines age > 25.
```sh
awk '$2 > 25 { print $1, $2 }' file.txt

Jonathan 28
Berto 30
```
String match.
```sh
awk '$1 == "Betsy" { print }' file.txt

Betsy 23 Rizal
```
Regex match.
```sh
awk '/Manila/' file.txt

Jonathan 28 Manila
```
### Calculations and Fields
#### Basic Calculation
```sh
awk '{ sum += $2 } END { print sum }' file.txt

81
```
```sh
awk '{ sum += $2; count++ } END { print sum/count }' file.txt

27
```
#### Built-n Variables
| Variable | Meaning          |
| -------- | ---------------- |
| `NR`     | Record number    |
| `NF`     | Number of fields |
| `$NF`    | Last field       |
| `FS`     | Input separator  |
| `OFS`    | Output separator |
##### NR - Record Number
Count the current line being processed, `$0` is the whole line
```sh
awk '{ print NR, $0 }' file.txt

1 Jonathan 28 Manila
2 Berto 30 Luna
3 Betsy 23 Rizal
```
```sh
awk '{ print NR, $3 }' file.txt

1 Manila
2 Luna
3 Rizal
```
##### NF – Number of Fields
Print number of columns in each row.
```sh
awk '{ print $1, "has", NF, "fields" }' file.txt

Jonathan has 3 fields
Berto has 3 fields
Betsy has 3 fields
```
##### $NF – Last Field
Print the last column.
```sh
awk '{ print $1, "lives in", $NF }' file.txt

Jonathan lives in Manila
Berto lives in Luna
Betsy lives in Rizal
```
##### FS – Input Field Separator
```sh 
awk 'BEGIN { FS = " " } { print $1, "is", $2, "years old" }' file.txt

Jonathan is 28 years old
Berto is 30 years old
Betsy is 23 years old
```
To have better demonstration, lets change the data.
*file.txt*
```txt
Jonathan,28,Manila
Berto,30,Luna
Betsy,23,Rizal
```
```sh
awk 'BEGIN { FS = "," } { print $1, "is", $2, "years old" }' file.txt

Jonathan is 28 years old
172 Berto is 30 years old
173 Betsy is 23 years old
```
##### OFS – Output Field Separator
Use to change the output separator.
```sh
Jonathan-28-Manila
Berto-30-Luna
Betsy-23-Rizal
```
#### Changing Fields
```sh
awk '{ $2 = $2 + 5; print }' file.txt

Jonathan 33 Manila
Berto 35 Luna
Betsy 28 Rizal
```
#### Filtering Rows
Print lines with more that 2 fields.
```sh
awk 'NF > 2' file.txt

Jonathan 28 Manila
Berto 30 Luna
Betsy 23 Rizal
```
#### Multiple Conditions
```sh
awk '$2 > 20 && $3 == "Manila"' file.txt

Jonathan 28 Manila
```
### Strings and Texts
#### String Functions
| Function                        | Description                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `length($0)`                    | Returns the length of a string (number of characters). `$0` refers to the entire line.   |
| `tolower(string)`               | Converts all characters in a string to lowercase.                                        |
| `toupper(string)`               | Converts all characters in a string to uppercase.                                        |
| `substr(string, start, length)` | Extracts a substring from `string` starting at `start` for `length` characters.          |
| `index(string, search)`         | Returns the position of `search` within `string` (1-based). Returns 0 if not found.      |
| `split(string, array, sep)`     | Splits `string` into an array using the separator `sep`. Returns the number of elements. |

##### length($0)
```sh
awk '{ print $1, length($0) }' file.txt

Jonathan 18
Berto 13
Betsy 14
```
##### tolower(string)
```sh
awk '{ print tolower($1) }' file.txt

jonathan
berto
betsy
```
##### toupper(string)
```sh
awk '{ print toupper($1) }' file.txt

JONATHAN
BERTO
BETSY
```
##### substr(string, start, length)
```sh
awk '{ print substr($1,1,4) }' file.txt

Jona
Bert
Bets
```
##### index(string, search)
```sh
awk '{ print index($3,"Man") }' file.txt

1
0
0
```
##### split(string, array, sep)
```sh
awk '{ n = split($0, a, " "); print a[1], a[3] }' file.txt

Jonathan Manila
Berto Luna
Betsy Rizal
```

#### Find and Replace
```sh
awk '{ gsub("Manila", "MNL"); print }' file.txt

Jonathan 28 MNL
Berto 30 Luna
Betsy 23 Rizal
```
Replace only first match:
```sh
awk '{ sub("Manila", "MNL"); print }' file.txt

Jonathan 28 MNL
Berto 30 Luna
Betsy 23 Rizal
```

### Control Flow
#### if/else
```sh
awk '{
  if ($2 >= 30)
    print $1, "Senior"
  else
    print $1, "Junior"
}' file.txt

Jonathan Junior
Berto Senior
Betsy Junior
```

#### loops
```sh
awk '{
  for (i=1; i<=NF; i++)
    print $i
}' file.txt

Jonathan
28
Manila
Berto
30
Luna
Betsy
23
Rizal
```
### Arrays
#### Counting Occurrences
```sh
awk '{ count[$1]++ } END {
  for (name in count)
    print name, count[name]
}' file.txt

Jonathan 1
Berto 1
Betsy 1
```
#### Summing by Category
*file.txt*
```txt
Jonathan Tambay 90
Berto Adik 180
Betsy Tambay 130
```
```sh
awk '{ sum[$2] += $3 } END {
  for (dept in sum)
    print dept, sum[dept]
}' file.txt

Tambay 220
Adik 180
```
### Advance Functions
####  Custom Functions
```sh
awk '
function add(a, b) {
  return a + b
}
{ print $1, add($3, 10) }
' file.txt

Jonathan 100
Berto 190
Betsy 140
```
#### Multi-file Processing
```sh
awk 'FNR==NR { a[$1]=$2; next }
     { print $1, a[$1] }' file1 file2
```
#### BEGIN and END Blocks
```sh
awk '
BEGIN { print "Report Start" }
{ sum += $3 }
END { print "Total:", sum }
' file.txt

Report Start
Total: 400
```
#### Formatting Output
%s → string
%d → integer
%f → floating-point number
\n → newline

```sh
awk '{ printf "%-3s %5d\n", $1, $3 }' file.txt

Jonathan    90
Berto   180
Betsy   130
```
##### Align Columns
```sh
awk '{ printf "%-10s %10s %-10s\n", $1, $2, $3 }' file.txt

Jonathan       Tambay 90
Berto            Adik 180
Betsy          Tambay 130
```
##### Format Numbers
```sh
awk '{ printf "%-10s tambay hours: %6.2f\n", $1, $3 }' file.txt

Jonathan   tambay hours:  90.00
Berto      tambay hours: 180.00
Betsy      tambay hours: 130.00
```
##### Combine Strings and Numbers
```sh
awk '{ printf "%s is %d years  %s\n", $1, $3, $2 }' file.txt

Jonathan is 90 years  Tambay
Berto is 180 years  Adik
Betsy is 130 years  Tambay
```
### Real-World Use Cases
Saw this example in net, might add if I got the time.
#### Extract Columns from Logs
```sh
awk '{ print $1, $4 }' access.log
```
#### Count HTTP Status Codes
```sh
awk '{ count[$9]++ } END {
  for (code in count)
    print code, count[code]
}' access.log
```
#### CSV Report
```sh
awk -F, '{ total += $3 } END { print "Total:", total }' sales.csv
```
#### Find Top User by Usage
```sh
awk '{ sum[$1]+=$2 }
END {
  for (user in sum)
    print sum[user], user
}' file.txt | sort -nr | head -1
```
