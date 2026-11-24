import { registerRootComponent } from 'expo';
import App from './App';

export class AppEntry {
  public static bootstrap(): void {
    registerRootComponent(App);
  }
}

AppEntry.bootstrap();
