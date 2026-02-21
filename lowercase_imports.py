import os
import re

def lowercase_imports(directory):
    # Regex to match import/export paths
    # Matches patterns like:
    # import { ... } from "@/components/Foo"
    # import "@/styles/Bar.css"
    # import(...) 
    # export { ... } from "./Baz"
    
    # We look for strings starting with @/, ./, or ../ inside quotes
    pattern = re.compile(r'((?:import|export)\s+.*?\s+from\s+[\'"])(@/|\./|\.\./)([^\'"]+)([\'"])')
    side_effect_import_pattern = re.compile(r'(import\s+[\'"])(@/|\./|\.\./)([^\'"]+)([\'"])')
    dynamic_import_pattern = re.compile(r'(import\s*\(\s*[\'"])(@/|\./|\.\./)([^\'"]+)([\'"]\s*\))')

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                
                # 1. Standard imports: import ... from "@/..."
                def replace_func(match):
                    prefix = match.group(1)
                    rel_prefix = match.group(2)
                    path = match.group(3)
                    suffix = match.group(4)
                    return f"{prefix}{rel_prefix}{path.lower()}{suffix}"

                new_content = pattern.sub(replace_func, new_content)
                
                # 2. Side-effect imports: import "@/..."
                new_content = side_effect_import_pattern.sub(replace_func, new_content)
                
                # 3. Dynamic imports: import("@/...")
                def dynamic_replace_func(match):
                    prefix = match.group(1)
                    rel_prefix = match.group(2)
                    path = match.group(3)
                    suffix = match.group(4)
                    return f"{prefix}{rel_prefix}{path.lower()}{suffix}"
                
                new_content = dynamic_import_pattern.sub(dynamic_replace_func, new_content)

                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {filepath}")

if __name__ == "__main__":
    lowercase_imports("src")
