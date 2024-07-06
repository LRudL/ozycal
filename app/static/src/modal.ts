interface IModalOption {
    bigText: string;
    smallText: string;
    value: string;
}

interface IModalOptionSet {
  titleText: string;
  helpText?: string | null;
  value: string;
  allowFreeText?: boolean;
  options: IModalOption[];
}

export interface IModalConfig {
    title?: string | null;
    helpText?: string | null;
    modalOptionSet: IModalOptionSet[];
}

export interface IModalResult {
  [key: string]: string;
}

export let MODAL_OPEN = false;

export class SubModal {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private optionsList: HTMLUListElement;
  private filteredOptions: IModalOption[];
  private selectedIndex: number = -1;
  private optionSet: IModalOptionSet;

  constructor(optionSet: IModalOptionSet) {
    this.optionSet = optionSet;
    this.container = document.createElement('div');
    this.container.className = 'submodal';

    const titleElement = document.createElement('h3');
    titleElement.textContent = optionSet.titleText;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.style.width = '100%';
    this.input.addEventListener('input', () => this.renderOptions());

    this.optionsList = document.createElement('ul');
    this.optionsList.className = 'modal-options';

    this.container.appendChild(titleElement);
    if (optionSet.helpText) {
      const helpText = document.createElement('p');
      helpText.className = 'modal-help';
      helpText.textContent = optionSet.helpText;
      this.container.appendChild(helpText);
    }
    this.container.appendChild(this.input);
    this.container.appendChild(this.optionsList);

    this.filteredOptions = [...optionSet.options];
    this.renderOptions(); // Add this line to show options immediately
  }

  private getFilteredOptions(): IModalOption[] {
    const inputValue = this.input.value.toLowerCase();
    return this.optionSet.options.filter(option => 
      (option.bigText + " - " + option.smallText).toLowerCase().includes(inputValue)
    );
  }

  renderOptions() {
    this.filteredOptions = this.getFilteredOptions();
    this.optionsList.innerHTML = '';
    this.filteredOptions.forEach((option, index) => {
      const li = document.createElement('li');
      li.textContent = `${option.bigText} - ${option.smallText}`;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => this.selectOption(index));
      this.optionsList.appendChild(li);
    });
    this.selectedIndex = this.filteredOptions.length > 0 ? 0 : -1;
    this.updateSelectedOption();
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveSelection(1);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this.moveSelection(-1);
        return true;
      case 'Enter':
        if (this.selectedIndex !== -1) {
          return true;
        } else if (this.optionSet.allowFreeText) {
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  moveSelection(direction: number) {
    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;
    this.updateSelectedOption();
  }

  updateSelectedOption() {
    const options = this.optionsList.children;
    for (let i = 0; i < options.length; i++) {
      const option = options[i] as HTMLLIElement;
      option.style.backgroundColor = i === this.selectedIndex ? '#e0e0e0' : '';
    }
  }

  selectOption(index: number) {
    this.selectedIndex = index;
    this.input.value = this.filteredOptions[index].bigText;
  }

  getSelectedValue(): string {
    if (this.selectedIndex !== -1) {
      return this.filteredOptions[this.selectedIndex].value;
    } else if (this.optionSet.allowFreeText) {
      return this.input.value;
    }
    return '';
  }

  getContainer(): HTMLDivElement {
    return this.container;
  }

  focus() {
    this.input.focus();
  }
}

export class Modal {
  private container: HTMLDivElement;
  private subModals: SubModal[];
  private currentSubModalIndex: number = 0;
  private modalConfig: IModalConfig;
  private keyDownHandler: (e: KeyboardEvent) => void;

  constructor(modalConfig: IModalConfig) {
    this.keyDownHandler = (e: KeyboardEvent) => null;
    this.modalConfig = modalConfig;
    this.container = document.createElement('div');
    this.container.className = 'modal';

    if (this.modalConfig.title) {
      const titleElement = document.createElement('h2');
      titleElement.textContent = this.modalConfig.title;
      this.container.appendChild(titleElement);
    }

    if (this.modalConfig.helpText) {
      const additionalHelpText = document.createElement('div');
      additionalHelpText.className = 'modal-additional-help';
      additionalHelpText.textContent = this.modalConfig.helpText;
      this.container.appendChild(additionalHelpText);
    }

    this.subModals = this.modalConfig.modalOptionSet.map(optionSet => new SubModal(optionSet));
    this.subModals.forEach(subModal => {
      this.container.appendChild(subModal.getContainer());
    });

    const helpText = document.createElement('div');
    helpText.className = 'modal-help';
    helpText.textContent = 'Press "Enter" to select an option and move to the next set, "Arrow Up" and "Arrow Down" to navigate, and "Escape" to close.';
    this.container.appendChild(helpText);

    document.body.appendChild(this.container); // Add this line to append the container to the document body

    this.keyDownHandler = this.handleKeyDown.bind(this);

    document.addEventListener('keydown', this.keyDownHandler);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!MODAL_OPEN) {
      return;
    }
    const currentSubModal = this.subModals[this.currentSubModalIndex];
    if (currentSubModal.handleKeyDown(e)) {
      if (e.key === 'Enter') {
        this.moveToNextSubModal();
      }
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  private moveToNextSubModal() {
    if (this.currentSubModalIndex < this.subModals.length - 1) {
      this.currentSubModalIndex++;
      this.subModals[this.currentSubModalIndex].focus();
    } else {
      this.submit();
    }
  }

  private submit() {
    const result: IModalResult = {};
    this.subModals.forEach((subModal, index) => {
      const optionSet = this.modalConfig.modalOptionSet[index];
      result[optionSet.value] = subModal.getSelectedValue();
    });
    this.close(result);
  }

  private close(result?: IModalResult) {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    MODAL_OPEN = false;
    if (this.resolvePromise) {
      this.resolvePromise(result);
    }

    document.removeEventListener('keydown', this.keyDownHandler);
  }

  private resolvePromise: ((value: IModalResult | PromiseLike<IModalResult> | undefined) => void) | null = null;

  show(): Promise<IModalResult | undefined> {
    this.container.style.display = 'block';

    this.subModals[0].focus();
    MODAL_OPEN = true;
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }
}