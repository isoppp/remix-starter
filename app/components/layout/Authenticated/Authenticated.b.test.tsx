import { render } from '@testing-library/react'
import type { ComponentPropsWithoutRef } from 'react'

import { Authenticated } from './Authenticated'

type ComponentProps = ComponentPropsWithoutRef<typeof Authenticated>
const renderComponent = (props?: Partial<ComponentProps>) => {
  return render(<Authenticated {...(props ?? {})} />)
}

describe('Authenticated', () => {
  it('renders correctly', () => {
    const { getByRole } = renderComponent()
    expect(getByRole('button')).toBeInTheDocument()
  })
})
