---
title: "Code in the Matrix - Neovim llama.cpp Plugin"
date: 2026-03-02
author: "Mark Taguiad"
tags: ["ai", "llama-cpp", "neovim", "nixos"]
UseHugoToc: true
weight: 2
---
{{< info >}}
The cover image is AI generated.
{{< /info >}}

{{< imglink src="/images/linux/matrix/llama-matrix.png" alt="imagen" >}}

# Table of Contents
{{< toc >}}

### Setup
I'm broke and have a slow workstation laptop and don't have claude code subscription - if you have those then you're in the wrong place my friend. 

There are other neovim plugins like [ollama.nvim](https://github.com/nomnivore/ollama.nvim) that can handle prompt and generation for you - just make sure your server/pc can handle it. In this setup we will use llama-cpp and [llama.vim](https://github.com/ggml-org/llama.vim) for code completions - applicable for low end hardware.

#### llama.cpp
I have and old Nvidia GPU but llama.cpp no longer supports it. So we need to use llama-cpp-vulkan. 
```bash
 environment.systemPackages = with pkgs; [
    llama-cpp # pkgs

   (llama-cpp.override {
     vulkanSupport = true;  
    };
```
Also vulkan support in nixos upstream is not yet supported. We need to overwrite the build process. Add this in the top of you configuration.nix file.
```bash
{ config, pkgs, ... }:

let
  # Override llama-cpp to enable Vulkan GPU support
  llamaCppVulkan = pkgs.llama-cpp.override {
    vulkanSupport = true;
    cudaSupport = false;
    rocmSupport = false;
  };
in
```
#### Model
Check this repo for model recommendation [llama.vim](https://github.com/ggml-org/llama.vim).

For my broke setup I used `ggml-org_Qwen2.5-Coder-1.5B-Q8_0-GGUF_qwen2.5-coder-1.5b-q8_0.gguf`.

#### llama-server
Add llama-server service. Tune based on your workstation/server specification.
```bash
  # llama-ccp server service
  services.llama-cpp = {
    enable = true;
    # package = llama-cpp-vulkan;
    model = "/srv/nvme/llm/models/ggml-org_Qwen2.5-Coder-1.5B-Q8_0-GGUF_qwen2.5-coder-1.5b-q8_0.gguf";
    host = "0.0.0.0";
    port = 8080;
    package = llamaCppVulkan;
    extraFlags = [
      "-c"
      "2048"
      "-ngl"
      "24"
      "--threads"
      "8"
      "--parallel"
      "1"
      "--batch-size"
      "128"
      "--ubatch-size"
      "128"
      "--no-mmap"
    ];
  };
```
### Neovim
Add this to you configuratin. Change the endpoint if you are hosting llama-server in a different host.
```bash
    vim.g.llama_config = {
      endpoint = "http://127.0.0.1:8080/infill",
    }
```
Add in `pkgs.vimPlugins`.
```
llama-vim
```
I'm using the default key binding. Again check the repo for custom key binding.

### Demo
{{< imageviewer folder="/images/linux/matrix/llama/" >}}

