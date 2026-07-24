package com.exersuite.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // El plugin de archivos nativos (guardar como / abrir documento) debe
    // registrarse ANTES de que el puente arranque.
    registerPlugin(Archivos.class);
    super.onCreate(savedInstanceState);
  }
}
