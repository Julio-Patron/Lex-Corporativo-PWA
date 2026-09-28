# **Framework de UI/UX Ejecutable (Proyecto: Pendiente)**

Basado en la filosofía de **"Design for Developers"** de Adrian Twarog y George Moller.

### **1\. El Sistema de Espaciado (The Spacing Engine)**

> * **Elemento Aislado:** Escala Base-4 o Base-8 (múltiplos de 4 u 8 píxeles).  
> * **Implementación:** Variables globales inmutables (Ej. \--space-1: 4px, \--space-3: 16px).  
> * **Regla:** El espacio interior (padding) debe ser igual o menor al exterior (margin).

### **2\. El Sistema Tipográfico (Typography Engine)**

> * **Elemento Aislado:** Escala Modular Tipográfica y Contraste de peso.  
> * **Implementación:** Restricción absoluta a 1-2 familias. Uso de 3 pesos: Regular (400), Medium (500), Bold (700).  
> * **Regla de Altura de Línea:** 1.5 a 1.6 para cuerpo de texto; 1.1 a 1.2 para títulos.

### **3\. El Sistema de Color (Color Logic Engine)**

> * **Elemento Aislado:** Paleta de grises (9 tonos), Color Primario y de Estado.  
> * **Implementación:** Regla 60-30-10 (60% fondo, 30% texto/secundarios, 10% acción/primario). NUNCA usar negro puro (\#000000).

### **4\. Jerarquía Visual y Anatomía de Componentes**

> * **Elemento Aislado:** Contraste, Profundidad (Sombras) y Botones.  
> * **Implementación:** 3 niveles de sombras (sm, md, lg).  
> * **Regla del Botón:** Solo un botón primario por vista (fondo sólido, texto blanco).

### **Matriz de Ejecución**

**A. En Desarrollo (Greenfield):** Inyección como Design Tokens (JSON/CSS) antes de maquetar.  
**B. Producto Terminado (Refactorización):** Uso del framework como Linter Visual / QA (Auditoría de espaciado, color y jerarquía).