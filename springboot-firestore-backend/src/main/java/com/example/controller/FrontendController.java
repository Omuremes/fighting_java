package com.example.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class FrontendController {
    
    // Forward non-API requests to React frontend
    @RequestMapping(value = {"/{path:[^\\.]*}", "/{path:[^\\.]*}/**"})
    public String redirect() {
        return "forward:/index.html";
    }
}
